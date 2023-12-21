const express = require("express"); // импорт библиотеки express
const path = require("path"); // импорт библиотеки path для работы с путями

const app = express(); // создание экземпляра приложения express
const PORT = 3000; // присвоения порта

const generating = "1011"; // порождающий полином

const MAX_RESPONSE_TIMEOUT = 3000;
const MAX_TIMEOUT = 1000; // максимальное время ожидания ответа
const MIN_TIMEOUT = 500; // минимальное время ожидания
const MAX_VALUE = 15; // максимальное значение случайного числа
const MIN_VALUE = 1; // минимальное значение случайного числа
const ENCODED_POLY_LEN = 7;
const POLY_LEN = 4;

// настройка для передачи статических файлов (__dirname - текущая директория)
// метод join используется для соединения путей с учётом особенностей операционной системы
app.use(express.static(path.join(__dirname, "frontend")));

// по корневому запросу отдаем файл index.html из папки ./frontend
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "/frontend/index.html"));
});

// описание long polling запроса
app.get("/long-polling-request", (req, res) => {
	// выбирается случайное время ожидания из отрезка [1000, 10 000]
	const timeout = Math.round(
		(MAX_TIMEOUT - MIN_TIMEOUT) * Math.random() + MIN_TIMEOUT
	);

	// выбирается случайное число из отрезка [1, 15], представляется в двоичном виде
	const value = Math.round((MAX_VALUE - MIN_VALUE) * Math.random() + MIN_VALUE);
	let original = value.toString(2);

	// полином может быть < 4 битов длиной, поэтому дополняем
	for (; original.length < POLY_LEN;) {
		original = "0" + original;
	}

	// сдвигаем на 3 бита влево
	let shifted = original + "000";

	// находим остаток от деления на образующий полином
	let remainder = getRemainder(shifted);

	// остаток мб < 3 битов длиной
	for (; remainder.length < ENCODED_POLY_LEN - POLY_LEN;) {
		remainder = "0" + remainder;
	}

	// закодированный полином = сдвинутый + остаток
	let encoded = (parseInt(shifted, 2) + parseInt(remainder, 2)).toString(2);

	// предыдущей командой мы переводили строку в число, поэтому закодированный полином может быть < 7 битов длиной
	for (; encoded.length < ENCODED_POLY_LEN;) {
		encoded = "0" + encoded;
	}

	// копируем закодированный полином, чтобы потом "портить" егоо копию
	let corrupted = encoded;

	// рандомим количество ошибок (от 0 до 2)
	let errorCount = Math.round(Math.random() * 2);

	// для одной ошибки
	if (errorCount === 1) {
		corrupted = makeOneErr(corrupted);
	}

	// для двух ошибок
	if (errorCount === 2) {
		corrupted = makeTwoErr(corrupted);
	}

	// timeout для ответа
	setTimeout(() => {
		if (timeout > MAX_RESPONSE_TIMEOUT) {
			res.sendStatus(502);
		} else {
			res.send({
				originalPoly: original,		// for example: 1010
				encodedPoly: encoded,			// for example: 1010011
				corruptedPoly: corrupted, 	// for example: 1010010
				errorCount: errorCount,					// for example: 1
			});
		}
	}, Math.min(timeout, MAX_RESPONSE_TIMEOUT));
});

// запуск сервера приложения
app.listen(PORT, () => {
	console.log(`Server started at http://localhost:${PORT}`);
});

const makeOneErr = (corrupted) => {
	// рандомим позицию ошибки
	let errIndex = Math.round(Math.random() * (ENCODED_POLY_LEN - 1));

	// строки в js неизменяемы, нужно перегонять в массив
	const encodedArr = corrupted.split("");

	// меняем бит на противоположный
	encodedArr[errIndex] = encodedArr[errIndex] === "0" ? "1" : "0";

	// собираем обратно в строку
	corrupted = encodedArr.join("");

	return corrupted;
};

const makeTwoErr = (corrupted) => {
	let errIndex_1 = Math.round(Math.random() * (ENCODED_POLY_LEN - 1));
	let errIndex_2 = Math.round(Math.random() * (ENCODED_POLY_LEN - 1));
	// в цикле проверяем, чтобы позиции ошибок были разные
	for (; errIndex_2 === errIndex_1;) {
		errIndex_2 = Math.round(Math.random() * (ENCODED_POLY_LEN - 1));
	}

	const encodedArr = corrupted.split("");

	encodedArr[errIndex_1] = encodedArr[errIndex_1] === "0" ? "1" : "0";
	encodedArr[errIndex_2] = encodedArr[errIndex_2] === "0" ? "1" : "0";

	corrupted = encodedArr.join("");

	return corrupted;
};

const getRemainder = (polynomial) => {
	let indexEnd = generating.length - 1;
	let currentDigit = polynomial.slice(0, indexEnd + 1);
	let remainder;

	while (indexEnd < polynomial.length) {
		remainder = (parseInt(currentDigit, 2) ^ parseInt(generating, 2)).toString(2);
		currentDigit = remainder;

		if (++indexEnd < polynomial.length) {
			while (
				indexEnd < polynomial.length &&
				currentDigit.length < generating.length
			) {
				currentDigit += polynomial[indexEnd++];
			}

			if (currentDigit.length < generating.length) {
				remainder = currentDigit;
			} else {
				indexEnd--;
			}
		}
	}

	if (remainder.length > generating.length - 1) {
		remainder = (parseInt(currentDigit, 2) ^ parseInt(generating, 2)).toString(2);
	}

	return remainder;
};
