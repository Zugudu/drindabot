const склайт = require('sqlite3').verbose()
const бд = new склайт.Database('db.sqlite3', (помилка) => {
	if(помилка){
		console.error('Невдача при підключені до БД')
		process.exit(1)
	}
	console.log('Підключено до БД')
})


скриптСтворенняКористувача = `
CREATE TABLE user(
	id INTEGER PRIMARY KEY UNIQUE,
	money INTEGER DEFAULT 0 NOT NULL,
	last INTEGER NOT NULL,
	name TEXT NOT NULL
) WITHOUT ROWID;
`
скриптСтворенняГри = 'CREATE TABLE game(time INTEGER UNIQUE NOT NULL, result INTEGER);'
скриптСтворенняСтавки = `
CREATE TABLE bet(
	user INTEGER NOT NULL,
	game INTEGER NOT NULL,
	bid INTEGER NOT NULL,
	FOREIGN KEY(user) REFERENCES user(id),
	FOREIGN KEY(game) REFERENCES game(ROWID)
);
`


бд.run(скриптСтворенняГри, (помилка) => {
	помилка ? console.error(помилка.message) : console.log('Таблицю ігор створено')
})
бд.run(скриптСтворенняКористувача, (помилка) => {
	помилка ? console.error(помилка.message) : console.log('Таблицю користувачів створено')
})
бд.run(скриптСтворенняСтавки, (помилка) => {
	помилка ? console.error(помилка.message) : console.log('Таблицю ставок створено')
})


бд.close((помилка) => {
	помилка ? console.error(помилка.message) : console.log('Відключенно від БД')
})