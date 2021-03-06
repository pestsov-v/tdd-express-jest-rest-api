# Использование методологии TDD

Test Driver Development - методика разработки, когда сперва создаётся ситуация, чтобы тест сознательно упал, после чего 
проделывается работа по созданию тестируемого функционала. Для уменьшения количества файлов вся логика описана в маршруте.

К примеру: необходимо написать метод получения списка всех пользователей. 
Исходные данные: Пустой маршрут ведущий по запросу получения всех пользователей, сам при этом callback функция пустая.
Маршрутизация в express.js устроена следующим образом:
```javascript
const express = require('express')
const router = express.Router()

router.method(path, ...middlewares, callback)
```
Где:
- `router` - экземпляр работы express.Router()
- `method` - REST метод: `post`, `patch`, и т.д. (в нашем случае `get`)
  - `path` - строковое значение эндпоинта, является обязательным параметром и указывает на маршрут, обращение к которому производит к срабатыванию callback-функции.
  - `...middlewares` - подключаемые промежуточные обработчики, является не обязательным параметром.
  - `callback` - callback-функция - контроллер, которая выполняет определённую логику при обращении к пути маршрута.

Пишется тест, который ожидает по обращению к маршруту - получить список пользователей в объекте ответа.
Тест падает.
Пишется логика по обращению к базе данных и возвращению в тело ответа - массива пользователей.

Приложение написано на следующем стэке:
- express.js
- jest
- sequelize
- sqlite
- i18n

## Оглавление

- [Использование методологии TDD](#использование-методологии-tdd)
  - [Оглавление](#оглавление)
  - [Запуск проекта](#запуск-проекта)
  - [Организация работы и особенности тестирования](#организация-работы-и-особенности-тестирования)
    - [Функции тестирования](#функции-тестирования)
      - [Инициализация и завершение тестов](#инициализация-и-завершение-тестов)
      - [Описание стандартных тестов](#описание-стандартных-тестов)
      - [Описание модулей с одним отличием](#описание-модулей-с-одним-отличием)
    - [Тестирования успешных ответов](#тестирования-успешных-ответов)
    - [Тестирование ответов исключений](#тестирование-ответов-исключений)

## Запуск проекта

1. Скачать архив с проектом с GitHub.
2. Войти на терминал в директорию, где был разархивирован проект и ввести команду: `npm install` для установки всех зависимостей.
3. Чтобы запустить работу самого приложения необходимо ввести команду: `npm run dev:server`, чтобы запустить проект в режиме тестирования, необходимо ввести команду: `npm run jest:test`.

## Организация работы и особенности тестирования

В данном проекте идёт обработка unit тестирования. Unit тестирование - это изолированное тестирование отдельных модулей.
Чтобы Unit тесты покрыли максимальное количество вариантов работы отдельного модуля, необходимо тестировать сами модули
по единой системе.

Правила системы:
- тестировать одно действие за один тест.
- использовать кальку базы данных для разработки или продакшена, но под другим названием.
- тестировать состояния.
- тестирования поведения.

### Функции тестирования

#### Инициализация и завершение тестов

Чтобы успешно протестировать отдельный модуль, необходимо в рамках этого модуля развернуть и свернуть все зависимости этого модуля,
для проверки его корректной работы.

Таким образом каждый модуль необходимо обвязывать функциям:
```javascript
beforeAll(callback) // Функция, которая испольняется до начало всех тестов.
beforeEach(callback) // Функция, которая испольняется до начало каждого теста.
afterEach(callback) // Функция, которая испольняется после окончания всех тестов.
afterAll(callback) // Функция, которая испольняется после окончания каждого теста.
```

Например, в функцию `beforeall(callback)` - для тестирования работы с базой данных необходимо в аргумент передать функцию обратного вызова, 
которая покдлючается к базе данных (отдельно стоит отметить, что это должна быть калька базы данных, которая используется для разработки).

#### Описание стандартных тестов

Описание тестов происходит с помощью передачи первым аргументом - названия теста в метод `it`.
Группировка тестов происходит покрытием тестов `it` блоком `describe`.

#### Описание модулей с одним отличием

В приложении используется тестирование модуля мультиязычности, таким образом один и тот же метод для различных языков должен возвращать значение в зависимости от выбранного языка.
Для этого используется функция тестирования `it.each`, первым аргументом обозначаются различия, после чего происходит тестирование модуля.

### Тестирования успешных ответов

Тестирование запросов не производится поскольку, если ответ является успешным, то результаты ожидания ответа и сам ответ будут совпадать,
если это не так, то модуль должен отреагировать на ошибку выбросив исключения.

Успешный ответ необходимо проверить на:
- статус код, который отдаётся на клиент и который ожидается.
- полный список всех ключей, которые отдаются на клиент и которые ожидаются.
- особенности самого модуля, например проверка валидности jwt токена, тип пустых значений и т.д.
- варианты ответов, в случае использования интернациональных сообщений.

### Тестирование ответов исключений

Тестирование исключений - это обработка всех возможных ошибок, которые могут быть спровоцированы работой модуля. 

Каждое исключение необходимо проверить на:
- статус код, который отдаётся на клиент, и который ожидается.
- сообщения исключения, которое отдаётся на клиент и которые ожидаются.
- массив отправляемых ключей, и, массив, ключей которые ожидаются.
- особенности самого модуля, к примеру срок жизни токена.
