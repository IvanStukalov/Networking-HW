import { message } from "./message/message.js";

const list = document.getElementById("list"); // список ответов от сервера
const startButton = document.getElementById("start"); // кнопка запуска long polling запросов
const finishButton = document.getElementById("finish"); // кнопка завершения long polling запросов
let isPolling = false; // текущее состояние запросов

const genPoly = "1011";
let verificationMatrix = ["1", "10", "100", "11", "110", "111", "101"];

let corruptedPoly;
let encodedPoly;
let errorCount;
let originalPoly;

const decoding = (data) => {
	// распаковываем ответ
	({ corruptedPoly, encodedPoly, errorCount, originalPoly } = data);

	// находим остаток
	const remainder = getRemainder(corruptedPoly);

	// сравниваем с проверочной матрицей
	let index = verificationMatrix.findIndex(element => element === remainder);

	// откидываем последние три бита
	let decodedPoly = corruptedPoly.slice(0, corruptedPoly.length - 3);

	// собираем ответ
	if (index < 0) {  // не нашли остаток в матрице -> считаем, что ответ правильный
		if (originalPoly === decodedPoly) {
			// если исходный и раскодированный полиномы равны, то все норм
			return message(originalPoly, encodedPoly, corruptedPoly, decodedPoly, errorCount, 1);
		} else {
			// если не равны, то все плохо, мы не смогли определить ошибку (практически невозможный вариант)
			return message(originalPoly, encodedPoly, corruptedPoly, decodedPoly, errorCount, 4);
		}
	} else { // если нашли в матрице, то считаем, что ошибка есть
		index = corruptedPoly.length - index - 1;

		// строки в js неизменяемы, нужно перегонять в массив
		let correctedPoly = corruptedPoly.split("");

		// меняем бит на противоположный
		correctedPoly[index] = correctedPoly[index] === "0" ? "1" : "0";

		// собираем обратно в строку
		correctedPoly = correctedPoly.join("");

		// раскодированный полином
		decodedPoly = correctedPoly.slice(0, corruptedPoly.length - 3);

		if (originalPoly === decodedPoly) {
			return message(originalPoly, encodedPoly, corruptedPoly, decodedPoly, errorCount, 2);
		} else {
			return message(originalPoly, encodedPoly, corruptedPoly, decodedPoly, errorCount, 3)
		}
	}
}

// функция получения остатка
const getRemainder = (polynomial) => {
	let rightBound = genPoly.length - 1;
	let subDividend = polynomial.slice(0, rightBound + 1);
	let remainder;

	// итеративно берем делимое длиной с порождающий алгоритм и находим остаток
	for (; rightBound < polynomial.length;) {
		remainder = (parseInt(subDividend, 2) ^ parseInt(genPoly, 2)).toString(2);
		subDividend = remainder;

		// сдвигаем правую границу делимого
		rightBound++;
		if (rightBound < polynomial.length) {
			for (; rightBound < polynomial.length && subDividend.length < genPoly.length;) {
				subDividend += polynomial[rightBound++];
				subDividend = String(Number(subDividend));
			}

			if (subDividend.length < genPoly.length) {
				remainder = subDividend;
			} else {
				rightBound--;
			}
		}
	}

	return remainder;
}

const subscribe = async () => {
	try {
		const response = await fetch("/long-polling-request");

		const div = document.createElement("div");
		div.style.marginBottom = "1em";

		if (response.status === 200) {
			const data = await response.json();
			div.innerHTML = decoding(data);
		} else if (response.status === 502) {
			div.innerText = `Превышено время ожидания ответа от сервера`;
		}

		list.appendChild(div);

		// если соединение еще не прервано, то рекурсивно запускаем функцию subscribe
		if (isPolling) {
			subscribe();
		}
	} catch (e) {
		// если в процессе запроса возникла непредвиденная ошибка на сервере, то запускаем функцию через 1с
		setTimeout(() => {
			// если соединение еще не прервано, то рекурсивно запускаем функцию subscribe
			if (isPolling) {
				subscribe();
			}
		}, 1000);
	}
};

// функция вызывается при нажатии на кнопку "начать"
const startConnectToServer = () => {
	finishButton.disabled = false;
	startButton.disabled = true;
	isPolling = true;

	subscribe();
};

// функция вызывается при нажатии на кнопку "закончить"
const finishConnectToServer = () => {
	startButton.disabled = false;
	finishButton.disabled = true;
	isPolling = false;
};

startButton.addEventListener("click", startConnectToServer);
finishButton.addEventListener("click", finishConnectToServer);
