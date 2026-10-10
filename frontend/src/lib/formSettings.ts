import { createContext } from 'react';
import type { Form } from './types';

/** Per-form options from Builder > Form settings. Stored in forms.settings and read by the respondent view. */
export type FormSettings = {
  nav_arrows?: boolean; progress_bar?: boolean; question_number?: boolean; asterisks?: boolean; letters?: boolean;
  autosave?: boolean; free_nav?: boolean; cookie_consent?: boolean; accepting?: boolean; notify?: boolean;
  language?: string; messages?: Record<string, string>;
};
export const FS_DEFAULTS = { nav_arrows: true, progress_bar: true, question_number: true, asterisks: true, letters: true, autosave: true, free_nav: false, cookie_consent: false, accepting: true, notify: false };
export type FS = typeof FS_DEFAULTS & { language: string; messages: Record<string, string> };
export const resolveSettings = (form: Pick<Form, 'settings'>): FS => ({ ...FS_DEFAULTS, ...(form.settings || {}), language: form.settings?.language || 'en', messages: form.settings?.messages || {} });

export type MsgDef = { group: string; key: string; label: string; def: string; max: number; vars?: string[] };
/** The system messages respondents see, in the order the original lists them. Only messages this clone actually shows. */
export const MESSAGES: MsgDef[] = [
  { group: 'Buttons, hints, and shortcuts', key: 'ok_button', label: 'Button to confirm answer', def: 'OK', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'enter_hint', label: 'Keyboard instruction to go to next question', def: 'press *Enter* ↵', max: 200 },
  { group: 'Buttons, hints, and shortcuts', key: 'multi_hint', label: 'Hint for multiple selection', def: 'Choose as many as you like', max: 165 },
  { group: 'Buttons, hints, and shortcuts', key: 'dropdown_hint', label: 'Instruction for Dropdown question', def: 'Type or select an option', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'text_hint', label: 'Hint for adding text', def: 'Type your answer here...', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'yes_label', label: 'Button to respond “Yes”', def: 'Yes', max: 255 },
  { group: 'Buttons, hints, and shortcuts', key: 'no_label', label: 'Button to respond “No”', def: 'No', max: 255 },
  { group: 'Buttons, hints, and shortcuts', key: 'submit_button', label: 'Button to send typeform', def: 'Submit', max: 100 },
  { group: 'Error messages', key: 'err_required', label: 'If an answer is required', def: 'Please fill this in', max: 64 },
  { group: 'Error messages', key: 'err_selection', label: 'If an answer requires a selection', def: 'Oops! Please make a selection', max: 386 },
  { group: 'Error messages', key: 'err_email', label: 'If an email address is incorrect', def: 'Hmm... that email doesn’t look right', max: 218 },
  { group: 'Error messages', key: 'err_number', label: 'If the entry is not a number', def: 'Numbers only please!', max: 218 },
  { group: 'Error messages', key: 'err_number_range', label: 'If number exceeds set min and max limits', def: 'Please enter a number between {min_value} and {max_value}', max: 64, vars: ['min_value', 'max_value'] },
  { group: 'Error messages', key: 'err_number_low', label: 'If the number entered is too low', def: 'Please enter a number greater than {min_value}', max: 141, vars: ['min_value'] },
  { group: 'Error messages', key: 'err_number_high', label: 'If the number entered is too high', def: 'Please enter a number lower than {max_value}', max: 141, vars: ['max_value'] },
  { group: 'Loading & completing a typeform', key: 'err_server', label: 'Error if there’s a problem with the server', def: 'Server error! Your request wasn’t completed', max: 128 },
  { group: 'Other', key: 'line_break', label: 'Hint for making a line break in Long Text questions', def: '*Shift ⇧ + Enter ↵* to make a line break', max: 128 },
];
const DEF = Object.fromEntries(MESSAGES.map((m) => [m.key, m.def]));

/** Languages in the "Main language" list (same order as the original: Arabic, English, then A to Z). */
export const LANGUAGES: [string, string][] = [['ar', 'Arabic'], ['en', 'English'], ['ca', 'Catalan'], ['zh', 'Chinese (simplified)'], ['zh-TW', 'Chinese (traditional)'], ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'], ['nl', 'Dutch'], ['fi', 'Finnish'], ['fr', 'French'], ['de', 'German'], ['el', 'Greek'], ['he', 'Hebrew'], ['hi', 'Hindi'], ['hu', 'Hungarian'], ['id', 'Indonesian'], ['it', 'Italian'], ['ja', 'Japanese'], ['ko', 'Korean'], ['no', 'Norwegian'], ['pl', 'Polish'], ['pt', 'Portuguese'], ['ro', 'Romanian'], ['ru', 'Russian'], ['es', 'Spanish'], ['sv', 'Swedish'], ['th', 'Thai'], ['tr', 'Turkish'], ['uk', 'Ukrainian'], ['vi', 'Vietnamese']];
const KEYS = MESSAGES.map((m) => m.key);
// built-in wording per language, in the order of MESSAGES; languages without an entry show English
const TR: Record<string, string[]> = {
  es: ['Aceptar', 'pulsa *Intro* ↵', 'Elige tantas como quieras', 'Escribe o selecciona una opción', 'Escribe tu respuesta aquí...', 'Sí', 'No', 'Enviar', 'Por favor, rellena esto', '¡Vaya! Por favor, haz una selección', 'Hmm... ese correo no parece correcto', '¡Solo números, por favor!', 'Introduce un número entre {min_value} y {max_value}', 'Introduce un número mayor que {min_value}', 'Introduce un número menor que {max_value}', 'Error del servidor. No se pudo completar tu solicitud', '*Shift ⇧ + Intro ↵* para hacer un salto de línea'],
  fr: ['OK', 'appuyez sur *Entrée* ↵', 'Choisissez-en autant que vous voulez', 'Saisissez ou sélectionnez une option', 'Saisissez votre réponse ici...', 'Oui', 'Non', 'Envoyer', 'Veuillez remplir ce champ', 'Oups ! Veuillez faire une sélection', 'Hmm... cette adresse e-mail ne semble pas correcte', 'Des chiffres uniquement, s’il vous plaît !', 'Veuillez saisir un nombre entre {min_value} et {max_value}', 'Veuillez saisir un nombre supérieur à {min_value}', 'Veuillez saisir un nombre inférieur à {max_value}', 'Erreur du serveur ! Votre demande n’a pas abouti', '*Maj ⇧ + Entrée ↵* pour passer à la ligne'],
  de: ['OK', 'Drücke *Enter* ↵', 'Wähle so viele, wie du möchtest', 'Eingeben oder eine Option auswählen', 'Gib hier deine Antwort ein...', 'Ja', 'Nein', 'Absenden', 'Bitte fülle dieses Feld aus', 'Hoppla! Bitte triff eine Auswahl', 'Hmm... diese E-Mail-Adresse sieht nicht richtig aus', 'Bitte nur Zahlen!', 'Bitte gib eine Zahl zwischen {min_value} und {max_value} ein', 'Bitte gib eine Zahl größer als {min_value} ein', 'Bitte gib eine Zahl kleiner als {max_value} ein', 'Serverfehler! Deine Anfrage wurde nicht abgeschlossen', '*Umschalt ⇧ + Enter ↵* für einen Zeilenumbruch'],
  pt: ['OK', 'pressione *Enter* ↵', 'Escolha quantas quiser', 'Digite ou selecione uma opção', 'Digite sua resposta aqui...', 'Sim', 'Não', 'Enviar', 'Por favor, preencha este campo', 'Ops! Por favor, faça uma seleção', 'Hmm... esse e-mail não parece correto', 'Somente números, por favor!', 'Digite um número entre {min_value} e {max_value}', 'Digite um número maior que {min_value}', 'Digite um número menor que {max_value}', 'Erro no servidor! Sua solicitação não foi concluída', '*Shift ⇧ + Enter ↵* para quebrar a linha'],
  it: ['OK', 'premi *Invio* ↵', 'Scegline quante vuoi', 'Digita o seleziona un’opzione', 'Scrivi qui la tua risposta...', 'Sì', 'No', 'Invia', 'Compila questo campo', 'Ops! Fai una selezione', 'Hmm... questa email non sembra corretta', 'Solo numeri, per favore!', 'Inserisci un numero tra {min_value} e {max_value}', 'Inserisci un numero maggiore di {min_value}', 'Inserisci un numero minore di {max_value}', 'Errore del server! La richiesta non è stata completata', '*Maiusc ⇧ + Invio ↵* per andare a capo'],
  nl: ['OK', 'druk op *Enter* ↵', 'Kies er zoveel als je wilt', 'Typ of selecteer een optie', 'Typ hier je antwoord...', 'Ja', 'Nee', 'Verzenden', 'Vul dit in', 'Oeps! Maak een keuze', 'Hmm... dat e-mailadres lijkt niet te kloppen', 'Alleen cijfers, alsjeblieft!', 'Voer een getal in tussen {min_value} en {max_value}', 'Voer een getal in groter dan {min_value}', 'Voer een getal in kleiner dan {max_value}', 'Serverfout! Je aanvraag is niet voltooid', '*Shift ⇧ + Enter ↵* voor een nieuwe regel'],
  hi: ['ठीक है', '*Enter* ↵ दबाएँ', 'जितने चाहें उतने चुनें', 'टाइप करें या कोई विकल्प चुनें', 'अपना उत्तर यहाँ लिखें...', 'हाँ', 'नहीं', 'जमा करें', 'कृपया इसे भरें', 'अरे! कृपया एक विकल्प चुनें', 'हम्म... यह ईमेल सही नहीं लग रहा', 'कृपया केवल संख्याएँ लिखें!', 'कृपया {min_value} और {max_value} के बीच की संख्या लिखें', 'कृपया {min_value} से बड़ी संख्या लिखें', 'कृपया {max_value} से छोटी संख्या लिखें', 'सर्वर त्रुटि! आपका अनुरोध पूरा नहीं हुआ', 'नई पंक्ति के लिए *Shift ⇧ + Enter ↵*'],
  ja: ['OK', '*Enter* ↵ を押してください', 'いくつでも選択できます', '入力するか、選択してください', 'ここに回答を入力...', 'はい', 'いいえ', '送信', 'こちらを入力してください', '選択してください', 'メールアドレスが正しくないようです', '数字のみ入力してください', '{min_value} から {max_value} の間の数字を入力してください', '{min_value} より大きい数字を入力してください', '{max_value} より小さい数字を入力してください', 'サーバーエラー。リクエストを完了できませんでした', '改行は *Shift ⇧ + Enter ↵*'],
  zh: ['确定', '按 *Enter* ↵', '可多选', '输入或选择一个选项', '在此输入你的答案...', '是', '否', '提交', '请填写此项', '请先做出选择', '这个邮箱地址似乎不正确', '请只输入数字', '请输入 {min_value} 到 {max_value} 之间的数字', '请输入大于 {min_value} 的数字', '请输入小于 {max_value} 的数字', '服务器错误，请求未完成', '按 *Shift ⇧ + Enter ↵* 换行'],
  ru: ['OK', 'нажмите *Enter* ↵', 'Выберите сколько угодно', 'Введите или выберите вариант', 'Введите ответ здесь...', 'Да', 'Нет', 'Отправить', 'Пожалуйста, заполните это поле', 'Ой! Пожалуйста, сделайте выбор', 'Хм... этот адрес электронной почты выглядит неверно', 'Только цифры, пожалуйста!', 'Введите число от {min_value} до {max_value}', 'Введите число больше {min_value}', 'Введите число меньше {max_value}', 'Ошибка сервера! Ваш запрос не был выполнен', '*Shift ⇧ + Enter ↵* для переноса строки'],
};
export const hasTranslation = (lang: string) => lang === 'en' || !!TR[lang];
export const defaultMsg = (key: string, lang = 'en') => { const i = KEYS.indexOf(key); return (TR[lang] && TR[lang][i]) || DEF[key] || key; };
export const fmt = (s: string, vars?: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : `{${k}}`));
export const makeT = (messages: Record<string, string> = {}, lang = 'en') => (key: string, vars?: Record<string, string | number>) => fmt(messages[key]?.trim() ? messages[key] : defaultMsg(key, lang), vars);

export const RunnerCtx = createContext<{ s: FS; t: ReturnType<typeof makeT> }>({ s: { ...FS_DEFAULTS, language: 'en', messages: {} }, t: makeT() });
