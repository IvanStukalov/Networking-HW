import { message } from "./message/message.js"; 

const list = document.getElementById("list"); // список ответов от сервера
const startButton = document.getElementById("start"); // кнопка запуска long polling запросов
const finishButton = document.getElementById("finish"); // кнопка завершения long polling запросов
let isPolling = false; // текущее состояние запросов

const generatingPolynomial = "1011";
let verificationMatrix = ["1", "10", "100", "11", "110", "111", "101"];

let corrupted_polynomial;
let encoded_polynomial;
let error_count; 
let original_polynomial;

const decoding = (data) => {
	({corrupted_polynomial, encoded_polynomial, error_count, original_polynomial} = data);

	const remainder = getRemainder(corrupted_polynomial);

	let index = verificationMatrix.findIndex(element => element === remainder);

	let decodedPolynomial = corrupted_polynomial.slice(0, corrupted_polynomial.length - 3);

	if (index < 0) {
		if (original_polynomial === decodedPolynomial) {
			return message(original_polynomial, encoded_polynomial, corrupted_polynomial, decodedPolynomial, error_count, 1);
		} else {
			return message(original_polynomial, encoded_polynomial, corrupted_polynomial, decodedPolynomial, error_count, 4);
		}
	} else {
		let correctedPolynomial = corrupted_polynomial;
		index = corrupted_polynomial.length - index - 1;

		correctedPolynomial = correctedPolynomial.substring(0, index) + String(correctedPolynomial[index] ^ 1) + correctedPolynomial.substring(index + 1);

		decodedPolynomial = correctedPolynomial.slice(0, corrupted_polynomial.length - 3);

		if (original_polynomial === decodedPolynomial) {
			return message(original_polynomial, encoded_polynomial, corrupted_polynomial, decodedPolynomial, error_count, 2);
		} else {
			return message(original_polynomial, encoded_polynomial, corrupted_polynomial, decodedPolynomial, error_count, 3)
		}
	}
}

const getRemainder = (polynomial) => {
	let indexEnd = generatingPolynomial.length - 1;
	let currentDigit = polynomial.slice(0, indexEnd + 1);
	let remainder;

	while (indexEnd < polynomial.length) {
		remainder = (parseInt(currentDigit, 2) ^ parseInt(generatingPolynomial, 2)).toString(2);
		currentDigit = remainder;

		if ((++indexEnd) < polynomial.length) {
			while (indexEnd < polynomial.length && currentDigit.length < generatingPolynomial.length) {
				currentDigit += polynomial[indexEnd++];
				currentDigit = String(+currentDigit);
			}
			
			if (currentDigit.length < generatingPolynomial.length) {
				remainder = currentDigit;
			} else {
				indexEnd--;
			}
		}
	}
	
	return remainder;
}

const subscribe = async () => {
	try {
		const response = await fetch("/long-polling-request");

		const node = document.createElement("div");
		node.style.marginBottom = "1em";

		if (response.status === 200) {
			const data = await response.json();
			node.innerHTML = decoding(data);
		} else if (response.status === 502) {
			node.innerText = `Превышено время ожидания ответа от сервера`;
		}

		list.appendChild(node);

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
