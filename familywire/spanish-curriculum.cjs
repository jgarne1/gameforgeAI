// Authored situational prompts. IDs and answers stay stable within this version.
const version='spanish-2026-10-v1';
const levels=['beginner','everyday','conversation'];
const bank=[
 ['b1',0,'At breakfast, “Buenos días” means…',['Good morning','Good night','See you later','Thank you'],0,'Buenos días is a morning greeting.'],
 ['b2',0,'Choose a polite way to order a coffee.',['Un café, por favor.','Soy un café.','El café es ayer.','Tengo café ayer.'],0,'Un café, por favor means “A coffee, please.”'],
 ['b3',0,'Someone helps you. What do you say?',['Gracias.','Adiós.','Buenas noches.','¿Dónde?'],0,'Gracias means “Thank you.”'],
 ['b4',0,'“¿Dónde está el baño?” asks…',['Where is the bathroom?','What time is it?','How much is it?','Do you speak English?'],0,'Dónde asks “where”; el baño is the bathroom.'],
 ['b5',0,'Complete: “Yo ___ español.” (I speak Spanish.)',['hablo','hablas','habla','hablan'],0,'With yo (I), use hablo.'],
 ['b6',0,'Build the phrase that asks for slower speech.',['¿Puedes','hablar','más','despacio?'],0,'¿Puedes hablar más despacio? = Can you speak more slowly?','order'],
 ['b7',0,'How do you say “I do not understand”?',['No entiendo.','No tengo.','No como.','No vivo.'],0,'Entiendo comes from entender, to understand.'],
 ['b8',0,'“Me llamo…” introduces…',['Your name','Your age','The price','The time'],0,'Me llamo Ana means “My name is Ana.”'],
 ['b9',0,'One year: “un ___”.',['año','día','mes','hora'],0,'Año means year. The ñ is a separate letter in Spanish.'],
 ['b10',0,'At a store, “¿Cuánto cuesta?” means…',['How much does it cost?','Where is it?','May I come in?','What is your name?'],0,'Cuánto asks “how much”; cuesta means “it costs.”'],
 ['e1',1,'Complete: “Nosotros ___ en casa.” (We eat at home.)',['comemos','como','comes','comen'],0,'The nosotros form of comer is comemos.'],
 ['e2',1,'You need the train station. Choose the question.',['¿Dónde está la estación?','¿Quién es la estación?','¿Cuándo eres estación?','¿Cuánto soy estación?'],0,'Use está for the location of a place.'],
 ['e3',1,'“Tengo hambre” means…',['I am hungry','I am tired','I am cold','I am late'],0,'Spanish uses tener hambre, literally “to have hunger.”'],
 ['e4',1,'Build a polite request for the bill.',['La','cuenta,','por','favor.'],0,'La cuenta, por favor. = The bill, please.','order'],
 ['e5',1,'Complete: “Ella ___ cansada.” (She is tired.)',['está','es','son','están'],0,'Use está for her current condition.'],
 ['e6',1,'What does “¿A qué hora sale el tren?” ask?',['What time does the train leave?','Where is the train?','Who is on the train?','How much is the train?'],0,'A qué hora asks “at what time”; sale means “leaves.”'],
 ['e7',1,'You cannot eat nuts. Choose the useful sentence.',['No puedo comer frutos secos.','No puedo vivir mañana.','No soy frutos secos.','No estoy comer frutos secos.'],0,'No puedo comer… means “I cannot eat…” Frutos secos means nuts.'],
 ['e8',1,'Complete: “Mañana ___ a estudiar.” (I am going to study tomorrow.)',['voy','vas','va','van'],0,'Voy a + infinitive expresses what I am going to do.'],
 ['e9',1,'“¿Puede repetirlo, por favor?” is a request to…',['Repeat it, please','Leave immediately','Write the bill','Speak English only'],0,'Puede is a polite form here; repetirlo means “repeat it.”'],
 ['e10',1,'Complete: “Quiero ___ una mesa.” (I want to reserve a table.)',['reservar','reservo','reserva','reservas'],0,'After quiero (I want), use the infinitive reservar.'],
 ['c1',2,'A friend asks “¿Te gustaría tomar un café?” Choose “I would love to.”',['Sí, me encantaría.','Sí, me encantaste.','Sí, me encantas café.','Sí, estoy encantar.'],0,'Me encantaría is a warm, polite “I would love to.”'],
 ['c2',2,'“Aunque llueve, vamos a salir.” means…',['Although it is raining, we are going out','Because it is sunny, we are staying in','If it rains, we will sleep','It never rains when we go out'],0,'Aunque means although; vamos a salir means we are going to go out.'],
 ['c3',2,'Complete: “Ayer ___ al mercado.” (Yesterday I went to the market.)',['fui','voy','iré','iba a ir mañana'],0,'Fui is the past form used here for “I went.”'],
 ['c4',2,'Build “I would like to book a room.”',['Me','gustaría','reservar','una habitación.'],0,'Me gustaría is a polite “I would like.”','order'],
 ['c5',2,'“¿Cuánto tiempo llevas aprendiendo español?” asks…',['How long have you been learning Spanish?','How much does a Spanish book cost?','Where did you learn English?','When will the lesson finish?'],0,'Llevar + time + gerund describes how long an activity has continued.'],
 ['c6',2,'Complete: “Si tengo tiempo, ___ contigo.” (If I have time, I will go with you.)',['iré','fui','iba ayer','he ido ayer'],0,'Ir has the future form iré here, “I will go.”'],
 ['c7',2,'You want to clarify: “¿Quieres decir que…?” means…',['Do you mean that…?','Do you want to leave…?','When did you say…?','Who will write…?'],0,'Quieres decir literally means “you want to say”; here it means “you mean.”'],
 ['c8',2,'Complete: “Espero que ___ un buen día.” (I hope you have a good day.)',['tengas','tienes','tener','tuviste ayer'],0,'Espero que takes the subjunctive here: tengas.'],
 ['c9',2,'“No estoy de acuerdo, pero entiendo tu punto.” means…',['I disagree, but I understand your point','I agree, but I cannot hear you','I forgot, but I found your house','I am tired, but I know the price'],0,'Estar de acuerdo means to agree. This phrase disagrees respectfully.'],
 ['c10',2,'Complete: “¿Podrías ___ un poco más despacio?” (Could you speak a little more slowly?)',['hablar','hablas','hablando','habló'],0,'After podrías, use the infinitive hablar.']
].map(([id,level,prompt,choices,answer,explanation,type='choice'])=>({id,level,prompt,choices,answer,explanation,type}));
module.exports={version,levels,bank};
