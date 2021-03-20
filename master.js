const склайт = require('sqlite3').verbose()
const ТГ = require('telebot')
require('dotenv').config()


//Перевірка змінних середовища
console.log('Перевірка змінних середовища')
if(!process.env.TOKEN){
	console.error('Немає змінної TOKEN у файлі .env')
	process.exit(1)
}
if(process.env.INTERVAL) console.warn('Немає змінної INTERVAL у файлі .env, використовую 2000')


//Ініціалізація данних
const бд = new склайт.Database('db.sqlite3', (помилка) => {
	if(помилка){
		console.error('Невдача при підключені до БД')
		process.exit(1)
	}
	console.log('Підключено до БД')
})
const бот = new ТГ({
	token: process.env.TOKEN,
	polling: {
		interval: (process.env.INTERVAL || 2000)
	}
})
process.on('SIGINT', () => {
	бд.close((помилка) => {
		помилка ? console.error(помилка.message) : console.log('Відключенно від БД')
		process.exit(0)
	})
})


//Функції
function випадковеЧисло(від, до){
	return Math.random() * (до - від) + від
}
function випадковеЦілеЧисло(від, до){
	return ~~(випадковеЧисло(від, до))
}
function відповісти(наЩо, як){
	наЩо.reply.text(як, {replyToMessage: наЩо.message_id})
}
function топ(колбек){
	бд.all('SELECT name, money FROM user ORDER BY money DESC;', колбек)
}
function методБд(запит){
	бд.run(запит, (помилка) => console.error(помилка))
}
function перевіркаПомилки(помилка, колбек){
	if(помилка) console.error(помилка.message)
	else колбек()
}

//Основні команди
бот.on('/dick', (пов) => {
	користувач = пов.from.id
	бд.get(`SELECT last, money FROM user WHERE id=${користувач};`, (помилка, дані) => {
		перевіркаПомилки(помилка, () => {
			випадковіМонети = випадковеЦілеЧисло(1, 15)
			зараз = ~~(Date.now() / 1000)
			if(дані){
				залишилосьЧасу = дані.last + 43200 - зараз
				if(залишилосьЧасу > 0){
					відповісти(пов, `
Ви вже грали недавно! Зачекайте ще ${~~(залишилосьЧасу/3600)}год та ${~~((залишилосьЧасу%3600)/60)}хв
					`)
				}else{
					новаКілкьістьМонет = дані.money + випадковіМонети
					if(новаКілкьістьМонет < 0) новаКілкьістьМонет = 0
					методБд(`UPDATE user SET money=${новаКілкьістьМонет}, last=${зараз}, name="${пов.from.first_name}" WHERE id=${користувач};`)
					відповісти(пов, `
Вітаємо! Ваша дринда виросла на ${випадковіМонети}см тепер її довжина ${новаКілкьістьМонет}см. Продовжуйте грати через 12 годин!
					`)
				}
			}else{
				if(випадковіМонети < 0) випадковіМонети = 0
				методБд(`INSERT INTO user VALUES(${користувач}, ${випадковіМонети}, ${зараз}, "${пов.from.first_name}");`)
				відповісти(пов, `
Вітаємо у грі найдовша дринда 2.0!
Ваша дринда виросла на ${випадковіМонети}см
Продовжуйте грати через 12 годин
				`)
				console.log(`Зареєстровано ${пов.from.first_name}`)
			}
		})
	})
})

бот.on('/top10', (пов) => {
	топ((помилка, дані) => {
		дані = дані.slice(0, 10)
		відповідь = ''
		номер = 1
		for(ел of дані){
			відповідь += `${номер++}. ${ел.name} - ${ел.money}см\n`
		}
		відповісти(пов, відповідь)
	})
})

бот.on('/жопа', (пов) => {
	топ((помилка, дані) => {
		відповідь = ''
		номер = 1
		for(ел of дані){
			відповідь += `${номер++}. ${ел.name} - ${ел.money}см\n`
		}
		відповісти(пов, відповідь)
	})
})

бот.on('/me', (пов) => {
	бд.get(`SELECT * FROM user WHERE id=${пов.from.id};`, (помилка, дані) => {
		перевіркаПомилки(помилка, () => {
			if(дані){
				зараз = ~~(Date.now() / 1000)
				залишилосьЧасу = дані.last + 43200 - зараз
				відповідь = `${дані.name} має дринду ${дані.money}см.\n`
				if(залишилосьЧасу > 0) відповідь += `До нової гри ще ${~~(залишилосьЧасу/3600)}год та ${~~((залишилосьЧасу%3600)/60)}хв`
				else відповідь += 'Нова гра вже доступна'
				відповісти(пов, відповідь)
			}else відповісти(пов, 'Вибачай, але ти не зареєстрований у грі на найдовшу дринду. Пиши /dick і гайда з нами')
		})
	})
})

бот.on(/^\/pay(@\w+)? (.+)$/i, (пов, дані) => {
	if(пов.reply_to_message){
		кількістьВзятки = дані.match[2]
		бд.get(`SELECT money FROM user WHERE id=${пов.from.id};`, (помилка, даніВідправника) => {
			перевіркаПомилки(помилка, () => {
				грошіВідправника = даніВідправника.money
				if(грошіВідправника < кількістьВзятки) відповісти(пов, 'У тебе немає такої великої дринди. Вертайся коли відростиш її')
				else{
					бд.get(`SELECT money FROM user WHERE id=${пов.reply_to_message.from.id};`, (помилка, даніОтримувача) => {
						перевіркаПомилки(помилка, () => {
							if(даніОтримувача){
								бд.run(`UPDATE user SET money=${даніОтримувача.money + ~~(кількістьВзятки)} WHERE id=${пов.reply_to_message.from.id};`, (помилка) => {
									перевіркаПомилки(помилка, () => {
										бд.run(`UPDATE user SET money=${грошіВідправника - кількістьВзятки} WHERE id=${пов.from.id};`, (помилка) => {
											перевіркаПомилки(помилка, () => {
												відповісти(пов, `
Гравець ${пов.reply_to_message.from.first_name} отримує ${кількістьВзятки}см дринди.
Дринда ${пов.reply_to_message.from.first_name} ${даніОтримувача.money + ~~(кількістьВзятки)}см.
Дринда ${пов.from.first_name} ${грошіВідправника - кількістьВзятки}см.
												`)
											})
										})
									})
								})
							}else{
								бд.run(`INSERT INTO user VALUES(${пов.reply_to_message.from.id},${кількістьВзятки},0,"${пов.reply_to_message.from.first_name}");`, (помилка) => {
									перевіркаПомилки(помилка, () => {
										відповісти(пов, `Гравець ${пов.reply_to_message.from.first_name} зареєстрвоаний у Дринді 2.0, йому передано ${кількістьВзятки}см дринди `)
									})
								})
							}
						})
					})
				}
			})
		})
	}else{
		відповісти(пов, 'Треба відправити команду у відповідь тому кому хочеш передати дринду')
	}
})

бот.on(/^\/bit(@\w+)? (.+)$/i, (пов, ставка) => {
	ставка = ~~(ставка.match[2])
	if(ставка > 0){
		бд.get(`SELECT money FROM user WHERE id=${пов.from.id};`, (помилка, дані) => {
			перевіркаПомилки(помилка, () => {
				if(дані){
					новіГроші = дані.money
					if(новіГроші >= ставка){
						if(Math.random() > 0.5){
							виграшКоеф = випадковеЧисло(0.5, 2)
							виграш = ~~(виграшКоеф*ставка)
							новіГроші += виграш
							відповісти(пов, `Ви виграли ${виграш}см дринди, тепер у Вас ${новіГроші}см`)
						}else{
							новіГроші -= ставка
							відповісти(пов, `Ви програли. Ваша ставка ${ставка}см, тепер у Вас ${новіГроші}см`)
						}
						методБд(`UPDATE user SET money=${новіГроші} WHERE id=${пов.from.id};`)
					}else відповісти(пов, 'У тебе недостатньо дринди для такої ставки')
				}else відповісти(пов, 'У тебе недостатньо дринди для такої ставки')
			})
		})
	}else{
		відповісти(пов, 'Ото ти хитрий лис, ставка має бути більше 0')
	}
})


бот.start()
