/**
 * Frågespelets frågebank. Varje text finns på arabiska, svenska och engelska
 * som tupeln [ar, sv, en]; answerIndex pekar ut rätt alternativ, så att rätt
 * svar följer med oavsett vilket språk som visas.
 *
 * Frågor 1–99 är kundens egen uppsättning; 100 och framåt är påfyllnad.
 */
import type { Language } from '../../prayer/types';

/** [arabiska, svenska, engelska] */
export type QuizText = readonly [string, string, string];

export type QuizQuestion = {
  id: number;
  question: QuizText;
  options: readonly QuizText[];
  /** Index i options för det rätta svaret. */
  answerIndex: number;
};

/**
 * Språk utan egen översättning visar arabiskan — hellre originalet än en
 * lucka. Byt fallbacken till index 2 den dag engelska passar bättre.
 */
export function quizText(text: QuizText, language: Language): string {
  if (language === 'sv') return text[1];
  if (language === 'en') return text[2];
  return text[0];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: ['ما أول هدية أهديت إلى الرسول صلى الله عليه وسلم بالمدينة؟', 'Vilken var den första gåvan som gavs till Profeten Muhammad i Medina?', 'What was the first gift given to the Prophet Muhammad in Medina?'],
    options: [
      ['قصعة خبزاً وسمناً ولبناً', 'En skål med bröd, smör och mjölk', 'A bowl of bread, butter and milk'],
      ['ثوب من الحرير', 'Ett klädesplagg av silke', 'A garment of silk'],
      ['فرس أصيل', 'En fullblodshäst', 'A purebred horse'],
      ['مبلغ من المال', 'En summa pengar', 'A sum of money'],
    ],
    answerIndex: 0,
  },
  {
    id: 2,
    question: ['من أول من قُتل من المشركين في غزوة بدر الكبرى؟', 'Vem var den förste av polyteisterna som dödades i slaget vid Badr?', 'Who was the first of the polytheists to be killed at the Battle of Badr?'],
    options: [
      ['أبو جهل', 'Abu Jahl', 'Abu Jahl'],
      ['الأسود بن عبد الأسد المخزومي', 'al-Aswad ibn Abd al-Asad al-Makhzumi', 'Al-Aswad ibn Abd al-Asad al-Makhzumi'],
      ['أمية بن خلف', 'Umayya ibn Khalaf', 'Umayya ibn Khalaf'],
      ['عتبة بن ربيعة', 'Utba ibn Rabia', 'Utba ibn Rabia'],
    ],
    answerIndex: 1,
  },
  {
    id: 3,
    question: ['من هي أول امرأة بكر هاجرت؟', 'Vem var den första ogifta kvinnan som utförde hijra?', 'Who was the first unmarried woman to make the hijra?'],
    options: [
      ['عائشة بنت أبي بكر', 'Aisha bint Abi Bakr', 'Aisha bint Abi Bakr'],
      ['أسماء بنت أبي بكر', 'Asma bint Abi Bakr', 'Asma bint Abi Bakr'],
      ['أم كلثوم بنت عقبة بن أبي معيط', 'Umm Kulthum bint Uqba ibn Abi Muayt', 'Umm Kulthum bint Uqba ibn Abi Muayt'],
      ['فاطمة بنت محمد', 'Fatima bint Muhammad', 'Fatima bint Muhammad'],
    ],
    answerIndex: 2,
  },
  {
    id: 4,
    question: ['من أول من صام؟', 'Vem var den förste som fastade?', 'Who was the first to fast?'],
    options: [
      ['نوح عليه السلام', 'Nuh (Noa)', 'Nuh (Noah)'],
      ['آدم عليه السلام', 'Adam', 'Adam'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
    ],
    answerIndex: 1,
  },
  {
    id: 5,
    question: ['ما أول ما تكلم به رسول الله صلى الله عليه وسلم حين قدم المدينة؟', 'Vad var det första Profeten Muhammad sade när han kom till Medina?', 'What were the first words the Prophet Muhammad spoke when he arrived in Medina?'],
    options: [
      ['صلوا الأرحام ، وصلوا والناس نيام تدخلوا الجنة بسلام', 'Knyt banden till era anhöriga, och be medan folket sover, så träder ni in i Paradiset i fred', 'Keep the ties of kinship, and pray while people sleep, and you will enter Paradise in peace'],
      ['أنفقوا ينفق الله عليكم', 'Ge frikostigt, så ger Allah er tillbaka', 'Spend generously, and Allah will spend on you'],
      ['جاهدوا في سبيل الله ترزقوا', 'Kämpa för Allahs sak, så får ni er försörjning', 'Strive in the way of Allah and you will be provided for'],
      ['هاجروا تؤجروا', 'Utför hijra, så belönas ni', 'Migrate, and you will be rewarded'],
    ],
    answerIndex: 0,
  },
  {
    id: 6,
    question: ['من أول من صنف تفسير القرآن الكريم بالإسناد؟', 'Vem var den förste som sammanställde en korantolkning med isnad (kedja av återberättare)?', 'Who was the first to compile a tafsir of the Quran with isnad (chains of narration)?'],
    options: [
      ['ابن جرير الطبري', 'Ibn Jarir at-Tabari', 'Ibn Jarir al-Tabari'],
      ['مالك بن أنس', 'Malik ibn Anas', 'Malik ibn Anas'],
      ['الشافعي', 'ash-Shafii', 'Al-Shafii'],
      ['ابن كثير', 'Ibn Kathir', 'Ibn Kathir'],
    ],
    answerIndex: 1,
  },
  {
    id: 7,
    question: ['من أول من هاجر من المسلمين إلى الحبشة؟', 'Vem var den förste muslimen som utvandrade till Abessinien?', 'Who was the first Muslim to emigrate to Abyssinia?'],
    options: [
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['حاطب بن عمرو', 'Hatib ibn Amr', 'Hatib ibn Amr'],
      ['جعفر بن أبي طالب', 'Jafar ibn Abi Talib', 'Jafar ibn Abi Talib'],
      ['أبو سلمة', 'Abu Salama', 'Abu Salama'],
    ],
    answerIndex: 1,
  },
  {
    id: 8,
    question: ['من أول من لبس السروال؟', 'Vem var den förste som bar byxor (sirwal)?', 'Who was the first to wear trousers (sirwal)?'],
    options: [
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['إسماعيل عليه السلام', 'Ismail', 'Ismail'],
      ['يوسف عليه السلام', 'Yusuf (Josef)', 'Yusuf (Joseph)'],
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
    ],
    answerIndex: 0,
  },
  {
    id: 9,
    question: ['من أول من قاتل بالسيف؟', 'Vem var den förste som stred med svärd?', 'Who was the first to fight with a sword?'],
    options: [
      ['داوود عليه السلام', 'Dawud (David)', 'Dawud (David)'],
      ['إبراهيم الخليل عليه السلام', 'Ibrahim, Allahs vän (al-Khalil)', 'Ibrahim, the friend of Allah (al-Khalil)'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
    ],
    answerIndex: 1,
  },
  {
    id: 10,
    question: ['من أول من سمي أحمد؟', 'Vem var den förste som fick namnet Ahmad?', 'Who was the first to be named Ahmad?'],
    options: [
      ['أحمد بن حنبل', 'Ahmad ibn Hanbal', 'Ahmad ibn Hanbal'],
      ['رسول الله صلى الله عليه وسلم', 'Allahs sändebud Muhammad', 'The Messenger of Allah, Muhammad'],
      ['أحمد بن طولون', 'Ahmad ibn Tulun', 'Ahmad ibn Tulun'],
      ['أحمد بن الفضل', 'Ahmad ibn al-Fadl', 'Ahmad ibn al-Fadl'],
    ],
    answerIndex: 1,
  },
  {
    id: 11,
    question: ['من أول من ولي بيت المال؟', 'Vem var den förste som fick ansvar för statskassan (bayt al-mal)?', 'Who was the first to be put in charge of the treasury (bayt al-mal)?'],
    options: [
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['أبو عبيدة الجراح', 'Abu Ubayda al-Jarrah', 'Abu Ubayda al-Jarrah'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
    ],
    answerIndex: 2,
  },
  {
    id: 12,
    question: ['ما أول جبل وضع في الأرض؟', 'Vilket var det första berget som placerades på jorden?', 'Which was the first mountain placed on the earth?'],
    options: [
      ['جبل أحد', 'Berget Uhud', 'Mount Uhud'],
      ['جبل أبي قبيس بمكة', 'Berget Abu Qubays i Mecka', 'Mount Abu Qubays in Mecca'],
      ['جبل طور سيناء', 'Berget Sinai (Tur Sina)', 'Mount Sinai (Tur Sina)'],
      ['جبل عرفات', 'Berget Arafat', 'Mount Arafat'],
    ],
    answerIndex: 1,
  },
  {
    id: 13,
    question: ['من أول من ألف في أحكام القرآن؟', 'Vem var den förste som skrev om Koranens rättsregler (ahkam al-Quran)?', 'Who was the first to write on the legal rulings of the Quran (ahkam al-Quran)?'],
    options: [
      ['الإمام الشافعي', 'Imam ash-Shafii', 'Imam al-Shafii'],
      ['الإمام مالك', 'Imam Malik', 'Imam Malik'],
      ['الإمام أحمد بن حنبل', 'Imam Ahmad ibn Hanbal', 'Imam Ahmad ibn Hanbal'],
      ['الإمام أبو حنيفة', 'Imam Abu Hanifa', 'Imam Abu Hanifa'],
    ],
    answerIndex: 0,
  },
  {
    id: 14,
    question: ['من أول داعية إسلامي؟', 'Vem var islams förste kallare (dai)?', 'Who was the first caller to Islam (dai)?'],
    options: [
      ['مصعب بن عمير', 'Musab ibn Umayr', 'Musab ibn Umayr'],
      ['سعد بن معاذ', 'Sad ibn Muadh', 'Sad ibn Muadh'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
    ],
    answerIndex: 0,
  },
  {
    id: 15,
    question: ['من أول من أضاف اسم الله إلى اسمه من الخلفاء؟', 'Vem var den förste kalifen som fogade Allahs namn till sitt eget?', 'Which caliph was the first to add the name of Allah to his own?'],
    options: [
      ['هارون الرشيد', 'Harun ar-Rashid', 'Harun al-Rashid'],
      ['المعتصم بالله', 'al-Mutasim biLlah', 'Al-Mutasim biLlah'],
      ['المأمون', 'al-Mamun', 'Al-Mamun'],
      ['أبو جعفر المنصور', 'Abu Jafar al-Mansur', 'Abu Jafar al-Mansur'],
    ],
    answerIndex: 1,
  },
  {
    id: 16,
    question: ['من أول من فتق لسانه بالعربية؟', 'Vem var den förste vars tunga talade ren arabiska?', 'Who was the first whose tongue spoke pure Arabic?'],
    options: [
      ['عدنان', 'Adnan', 'Adnan'],
      ['إسماعيل عليه السلام', 'Ismail', 'Ismail'],
      ['يعرب بن قحطان', 'Yarub ibn Qahtan', 'Yarub ibn Qahtan'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
    ],
    answerIndex: 1,
  },
  {
    id: 17,
    question: ['من أول من طاف بالبيت العتيق؟', 'Vem utförde den första tawaf runt det uråldriga huset (Kaba)?', 'Who first performed tawaf around the Ancient House (the Kaaba)?'],
    options: [
      ['آدم عليه السلام', 'Adam', 'Adam'],
      ['الملائكة', 'Änglarna', 'The angels'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['نوح عليه السلام', 'Nuh (Noa)', 'Nuh (Noah)'],
    ],
    answerIndex: 1,
  },
  {
    id: 18,
    question: ['من أول من قال الشعر؟', 'Vem var den förste som diktade poesi?', 'Who was the first to compose poetry?'],
    options: [
      ['إدريس عليه السلام', 'Idris', 'Idris'],
      ['آدم عليه السلام', 'Adam', 'Adam'],
      ['امرؤ القيس', 'Imru al-Qays', 'Imru al-Qays'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
    ],
    answerIndex: 1,
  },
  {
    id: 19,
    question: ['من أول من استلم الحجر الأسود من الأئمة؟', 'Vem av ledarna var den förste att röra vid den svarta stenen?', 'Which of the leaders was the first to touch the Black Stone?'],
    options: [
      ['ابن الزبير', 'Ibn az-Zubayr', 'Ibn al-Zubayr'],
      ['عمر بن عبد العزيز', 'Umar ibn Abd al-Aziz', 'Umar ibn Abd al-Aziz'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['الحسن بن علي', 'al-Hasan ibn Ali', 'Al-Hasan ibn Ali'],
    ],
    answerIndex: 0,
  },
  {
    id: 20,
    question: ['ما أول سورة نزلت في مكة المكرمة؟', 'Vilken var den första suran som uppenbarades i Mecka?', 'Which was the first surah revealed in Mecca?'],
    options: [
      ['الفاتحة', 'Surah al-Fatiha', 'Surah al-Fatiha'],
      ['العلق', 'Surah al-Alaq', 'Surah al-Alaq'],
      ['المدثر', 'Surah al-Muddaththir', 'Surah al-Muddaththir'],
      ['القلم', 'Surah al-Qalam', 'Surah al-Qalam'],
    ],
    answerIndex: 1,
  },
  {
    id: 21,
    question: ['من أول من اتخذ الدفاتر للدولة؟', 'Vem var den förste som förde register (diwan) för en stat?', 'Who was the first to keep official registers for a state?'],
    options: [
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
      ['يوسف عليه السلام', 'Yusuf (Josef)', 'Yusuf (Joseph)'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['داوود عليه السلام', 'Dawud (David)', 'Dawud (David)'],
    ],
    answerIndex: 1,
  },
  {
    id: 22,
    question: ['من أول من يفيق بعد النفخ في الصور؟', 'Vem vaknar först efter att hornet blåsts?', 'Who is the first to awaken after the trumpet is blown?'],
    options: [
      ['إسرافيل عليه السلام', 'Ängeln Israfil', 'The angel Israfil'],
      ['الرسول صلى الله عليه وسلم', 'Profeten Muhammad', 'The Prophet Muhammad'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
    ],
    answerIndex: 1,
  },
  {
    id: 23,
    question: ['من أول أمير في الإسلام؟', 'Vem var den förste befälhavaren (amir) i islam?', 'Who was the first commander (amir) in Islam?'],
    options: [
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
      ['عبد الله بن جحش الأسدي', 'Abdullah ibn Jahsh al-Asadi', 'Abdullah ibn Jahsh al-Asadi'],
      ['سعد بن أبي وقاص', 'Sad ibn Abi Waqqas', 'Sad ibn Abi Waqqas'],
      ['خالد بن الوليد', 'Khalid ibn al-Walid', 'Khalid ibn al-Walid'],
    ],
    answerIndex: 1,
  },
  {
    id: 24,
    question: ['من أول من نقض العهد مع الرسول صلى الله عليه وسلم من القبائل اليهودية؟', 'Vilken judisk stam bröt först sitt avtal med Profeten Muhammad?', 'Which Jewish tribe was the first to break its treaty with the Prophet Muhammad?'],
    options: [
      ['يهود بني قريظة', 'Banu Qurayza', 'Banu Qurayza'],
      ['يهود بني النضير', 'Banu an-Nadir', 'Banu al-Nadir'],
      ['يهود بني قينقاع', 'Banu Qaynuqa', 'Banu Qaynuqa'],
      ['يهود خيبر', 'Judarna i Khaybar', 'The Jews of Khaybar'],
    ],
    answerIndex: 2,
  },
  {
    id: 25,
    question: ['من أول من كتب لا إله إلا الله محمد رسول الله على العملة؟', 'Vem var den förste att prägla trosbekännelsen på mynt?', 'Who was the first to inscribe the declaration of faith on coinage?'],
    options: [
      ['عبد الملك بن مروان', 'Abd al-Malik ibn Marwan', 'Abd al-Malik ibn Marwan'],
      ['الحجاج بن يوسف الثقفي', 'al-Hajjaj ibn Yusuf ath-Thaqafi', 'Al-Hajjaj ibn Yusuf al-Thaqafi'],
      ['عمر بن عبد العزيز', 'Umar ibn Abd al-Aziz', 'Umar ibn Abd al-Aziz'],
      ['أبو جعفر المنصور', 'Abu Jafar al-Mansur', 'Abu Jafar al-Mansur'],
    ],
    answerIndex: 1,
  },
  {
    id: 26,
    question: ['ما أول دار بنيت في مكة؟', 'Vilket var det första huset som byggdes i Mecka?', 'Which was the first house built in Mecca?'],
    options: [
      ['دار الأرقم', 'al-Arqams hus', 'The house of al-Arqam'],
      ['دار الندوة', 'Dar an-Nadwa', 'Dar al-Nadwa'],
      ['الكعبة المشرفة', 'Den heliga Kaba', 'The Holy Kaaba'],
      ['دار عبد المطلب', 'Abd al-Muttalibs hus', 'The house of Abd al-Muttalib'],
    ],
    answerIndex: 1,
  },
  {
    id: 27,
    question: ['من أول من أدخل عبادة الأصنام إلى الجزيرة العربية؟', 'Vem införde först idoldyrkan på Arabiska halvön?', 'Who first introduced idol worship to the Arabian Peninsula?'],
    options: [
      ['أبو جهل', 'Abu Jahl', 'Abu Jahl'],
      ['أبو لهب', 'Abu Lahab', 'Abu Lahab'],
      ['أبو خزاعة عمرو بن لحي', 'Amr ibn Luhayy al-Khuzai', 'Amr ibn Luhayy al-Khuzai'],
      ['أمية بن خلف', 'Umayya ibn Khalaf', 'Umayya ibn Khalaf'],
    ],
    answerIndex: 2,
  },
  {
    id: 28,
    question: ['من أول من سل سيفاً في سبيل الله؟', 'Vem var den förste som drog sitt svärd för Allahs sak?', 'Who was the first to draw a sword in the cause of Allah?'],
    options: [
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['الزبير بن العوام', 'az-Zubayr ibn al-Awwam', 'Al-Zubayr ibn al-Awwam'],
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
    ],
    answerIndex: 1,
  },
  {
    id: 29,
    question: ['من أول ملك فرعوني آمن بالتوحيد؟', 'Vilken var den förste egyptiske farao som trodde på en enda gud?', 'Which was the first Egyptian pharaoh to believe in one God?'],
    options: [
      ['رمسيس الثاني', 'Ramses II', 'Ramesses II'],
      ['اخناتون', 'Achnaton', 'Akhenaten'],
      ['توت عنخ آمون', 'Tutankhamon', 'Tutankhamun'],
      ['أحمس', 'Ahmose', 'Ahmose'],
    ],
    answerIndex: 1,
  },
  {
    id: 30,
    question: ['من أول جبار في الأرض لعنه الله؟', 'Vem var den förste tyrannen på jorden som Allah förbannade?', 'Who was the first tyrant on earth cursed by Allah?'],
    options: [
      ['فرعون', 'Farao', 'Pharaoh'],
      ['النمرود', 'Nimrod', 'Nimrod'],
      ['قارون', 'Qarun (Korach)', 'Qarun (Korah)'],
      ['هامان', 'Haman', 'Haman'],
    ],
    answerIndex: 1,
  },
  {
    id: 31,
    question: ['من أول مسلم ركب بحر الروم؟', 'Vem var den förste muslimen som seglade på Medelhavet?', 'Who was the first Muslim to sail the Mediterranean?'],
    options: [
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['معاوية بن أبي سفيان', 'Muawiya ibn Abi Sufyan', 'Muawiya ibn Abi Sufyan'],
      ['عمرو بن العاص', 'Amr ibn al-As', 'Amr ibn al-As'],
      ['عقبة بن نافع', 'Uqba ibn Nafi', 'Uqba ibn Nafi'],
    ],
    answerIndex: 1,
  },
  {
    id: 32,
    question: ['من أول من قال (أما بعد)؟', 'Vem var den förste som sade uttrycket "amma bad" (och vidare)?', 'Who was the first to use the expression "amma bad" (now then)?'],
    options: [
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
      ['داوود عليه السلام', 'Dawud (David)', 'Dawud (David)'],
      ['لقمان الحكيم', 'Luqman den vise', 'Luqman the Wise'],
      ['قس بن ساعدة', 'Qass ibn Saida', 'Qass ibn Saida'],
    ],
    answerIndex: 1,
  },
  {
    id: 33,
    question: ['من أول قاضٍ في البصرة؟', 'Vem var den förste domaren i Basra?', 'Who was the first judge in Basra?'],
    options: [
      ['شريح القاضي', 'Shurayh domaren', 'Shurayh the judge'],
      ['أبو مريم الحنفي', 'Abu Maryam al-Hanafi', 'Abu Maryam al-Hanafi'],
      ['الحسن البصري', 'al-Hasan al-Basri', 'Al-Hasan al-Basri'],
      ['سعيد بن المسيب', 'Said ibn al-Musayyib', 'Said ibn al-Musayyib'],
    ],
    answerIndex: 1,
  },
  {
    id: 34,
    question: ['من أول قاضٍ في الكوفة؟', 'Vem var den förste domaren i Kufa?', 'Who was the first judge in Kufa?'],
    options: [
      ['شريح القاضي', 'Shurayh domaren', 'Shurayh the judge'],
      ['جبير بن القشعم', 'Jubayr ibn al-Qashaam', 'Jubayr ibn al-Qashaam'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['ابن مسعود', 'Ibn Masud', 'Ibn Masud'],
    ],
    answerIndex: 1,
  },
  {
    id: 35,
    question: ['من أول قاضٍ في مصر؟', 'Vem var den förste domaren i Egypten?', 'Who was the first judge in Egypt?'],
    options: [
      ['عمرو بن العاص', 'Amr ibn al-As', 'Amr ibn al-As'],
      ['قيس بن أبي العاص', 'Qays ibn Abi al-As', 'Qays ibn Abi al-As'],
      ['عقبة بن نافع', 'Uqba ibn Nafi', 'Uqba ibn Nafi'],
      ['عبد الله بن سعد', 'Abdullah ibn Sad', 'Abdullah ibn Sad'],
    ],
    answerIndex: 1,
  },
  {
    id: 36,
    question: ['من أول من عمل الأوزان للمسلمين؟', 'Vem var den förste som fastställde vikter och mått för muslimerna?', 'Who was the first to establish weights and measures for the Muslims?'],
    options: [
      ['عبد الملك بن مروان', 'Abd al-Malik ibn Marwan', 'Abd al-Malik ibn Marwan'],
      ['الحجاج بن يوسف', 'al-Hajjaj ibn Yusuf', 'Al-Hajjaj ibn Yusuf'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['زياد بن أبيه', 'Ziyad ibn Abihi', 'Ziyad ibn Abihi'],
    ],
    answerIndex: 1,
  },
  {
    id: 37,
    question: ['من أول من أمر بتجويف المحاريب في المساجد؟', 'Vem befallde först att moskéernas mihrab skulle byggas som en nisch?', 'Who first ordered that the mihrab in mosques be built as a recess?'],
    options: [
      ['عمر بن عبد العزيز', 'Umar ibn Abd al-Aziz', 'Umar ibn Abd al-Aziz'],
      ['الوليد بن عبد الملك', 'al-Walid ibn Abd al-Malik', 'Al-Walid ibn Abd al-Malik'],
      ['معاوية بن أبي سفيان', 'Muawiya ibn Abi Sufyan', 'Muawiya ibn Abi Sufyan'],
      ['هارون الرشيد', 'Harun ar-Rashid', 'Harun al-Rashid'],
    ],
    answerIndex: 1,
  },
  {
    id: 38,
    question: ['من أول من فرش المسجد بالحصبة (الحصى الصغير)؟', 'Vem var den förste som täckte moskégolvet med småsten (hasba)?', 'Who was the first to spread small pebbles (hasba) over the mosque floor?'],
    options: [
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
    ],
    answerIndex: 1,
  },
  {
    id: 39,
    question: ['ما أول جيش خرج من المدينة بعد وفاة الرسول صلى الله عليه وسلم؟', 'Vilken var den första armén som lämnade Medina efter Profeten Muhammads bortgång?', 'Which was the first army to leave Medina after the passing of the Prophet Muhammad?'],
    options: [
      ['جيش أسامة بن زيد', 'Usama ibn Zayds armé', 'The army of Usama ibn Zayd'],
      ['جيش سلمة بن الزبير', 'Salama ibn az-Zubayrs armé', 'The army of Salama ibn al-Zubayr'],
      ['جيش خالد بن الوليد', 'Khalid ibn al-Walids armé', 'The army of Khalid ibn al-Walid'],
      ['جيش أبي عبيدة', 'Abu Ubaydas armé', 'The army of Abu Ubayda'],
    ],
    answerIndex: 1,
  },
  {
    id: 40,
    question: ['من أول من تمنى الموت من الأنبياء؟', 'Vem var den förste av profeterna som önskade sig döden?', 'Who was the first of the prophets to wish for death?'],
    options: [
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
      ['يوسف عليه السلام', 'Yusuf (Josef)', 'Yusuf (Joseph)'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
    ],
    answerIndex: 1,
  },
  {
    id: 41,
    question: ['ما أول صلاة فرضت على الرسول صلى الله عليه وسلم؟', 'Vilken bön ålades Profeten Muhammad först?', 'Which prayer was first made obligatory upon the Prophet Muhammad?'],
    options: [
      ['صلاة الفجر', 'Fajr (morgonbönen)', 'Fajr (the dawn prayer)'],
      ['صلاة الظهر', 'Dhuhr (middagsbönen)', 'Dhuhr (the noon prayer)'],
      ['صلاة العصر', 'Asr (eftermiddagsbönen)', 'Asr (the afternoon prayer)'],
      ['صلاة المغرب', 'Maghrib (solnedgångsbönen)', 'Maghrib (the sunset prayer)'],
    ],
    answerIndex: 1,
  },
  {
    id: 42,
    question: ['من أول من أذن في السماء؟', 'Vem gav den första bönekallelsen (adhan) i himlen?', 'Who gave the first call to prayer (adhan) in the heavens?'],
    options: [
      ['جبريل عليه السلام', 'Ängeln Jibril (Gabriel)', 'The angel Jibril (Gabriel)'],
      ['ميكائيل عليه السلام', 'Ängeln Mikail (Mikael)', 'The angel Mikail (Michael)'],
      ['إسرافيل عليه السلام', 'Ängeln Israfil', 'The angel Israfil'],
      ['رضوان عليه السلام', 'Ängeln Ridwan', 'The angel Ridwan'],
    ],
    answerIndex: 0,
  },
  {
    id: 43,
    question: ['من أول من قدر الساعات الاثنتي عشرة؟', 'Vem var den förste som delade in dygnet i tolv timmar?', 'Who was the first to reckon the twelve hours?'],
    options: [
      ['إدريس عليه السلام', 'Idris', 'Idris'],
      ['نوح عليه السلام', 'Nuh (Noa)', 'Nuh (Noah)'],
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
      ['آدم عليه السلام', 'Adam', 'Adam'],
    ],
    answerIndex: 1,
  },
  {
    id: 44,
    question: ['من أول من قال: (سبحان ربي الأعلى)؟', 'Vem sade först "Subhana Rabbiyal Ala" (ära vare min Herre, den Högste)?', 'Who was the first to say "Subhana Rabbiyal Ala" (glory to my Lord, the Most High)?'],
    options: [
      ['جبريل عليه السلام', 'Ängeln Jibril (Gabriel)', 'The angel Jibril (Gabriel)'],
      ['إسرافيل عليه السلام', 'Ängeln Israfil', 'The angel Israfil'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
    ],
    answerIndex: 1,
  },
  {
    id: 45,
    question: ['ما أول شيء بناه الله تعالى؟', 'Vad var det första Allah byggde?', 'What was the first thing Allah built?'],
    options: [
      ['الأرض', 'Jorden', 'The earth'],
      ['السماء', 'Himlen', 'The heaven'],
      ['العرش', 'Tronen', 'The Throne'],
      ['القلم', 'Pennan', 'The Pen'],
    ],
    answerIndex: 1,
  },
  {
    id: 46,
    question: ['ما أول ما كتب القلم؟', 'Vad var det första pennan skrev?', 'What was the first thing the Pen wrote?'],
    options: [
      ['أنا الرحمن الرحيم', 'Jag är den Nåderike, den Barmhärtige', 'I am the Most Gracious, the Most Merciful'],
      ['أنا التواب أتوب على من تاب', 'Jag är den som tar emot ånger; jag förlåter den som vänder om', 'I am the Accepter of repentance; I forgive whoever repents'],
      ['لا إله إلا الله', 'Det finns ingen gud utom Allah', 'There is no god but Allah'],
      ['سبحان الله وبحمده', 'Ära vare Allah och lov till Honom', 'Glory be to Allah and praise be to Him'],
    ],
    answerIndex: 1,
  },
  {
    id: 47,
    question: ['ما أول يوم خلقه الله؟', 'Vilken var den första dagen Allah skapade?', 'Which was the first day Allah created?'],
    options: [
      ['يوم الجمعة', 'Fredagen', 'Friday'],
      ['يوم الأحد', 'Söndagen', 'Sunday'],
      ['يوم السبت', 'Lördagen', 'Saturday'],
      ['يوم الإثنين', 'Måndagen', 'Monday'],
    ],
    answerIndex: 1,
  },
  {
    id: 48,
    question: ['من أول من بنى السجون في الإسلام؟', 'Vem var den förste som byggde fängelser i islam?', 'Who was the first to build prisons in Islam?'],
    options: [
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['معاوية بن أبي سفيان', 'Muawiya ibn Abi Sufyan', 'Muawiya ibn Abi Sufyan'],
      ['الحجاج بن يوسف', 'al-Hajjaj ibn Yusuf', 'Al-Hajjaj ibn Yusuf'],
    ],
    answerIndex: 1,
  },
  {
    id: 49,
    question: ['من هو الصحابي الذي كانت الملائكة تسلم عليه؟', 'Vilken följeslagare hälsades av änglarna?', 'Which companion was greeted by the angels?'],
    options: [
      ['عمران بن حصين', 'Imran ibn Husayn', 'Imran ibn Husayn'],
      ['سعد بن معاذ', 'Sad ibn Muadh', 'Sad ibn Muadh'],
      ['أبي بن كعب', 'Ubayy ibn Kab', 'Ubayy ibn Kab'],
      ['حذيفة بن اليمان', 'Hudhayfa ibn al-Yaman', 'Hudhayfa ibn al-Yaman'],
    ],
    answerIndex: 0,
  },
  {
    id: 50,
    question: ['من هو الصحابي الذي كانت تستحي منه ملائكة السماء؟', 'Vilken följeslagare visade himlens änglar blygsamhet inför?', 'Before which companion did the angels of heaven feel shy?'],
    options: [
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['أبو عبيدة الجراح', 'Abu Ubayda al-Jarrah', 'Abu Ubayda al-Jarrah'],
    ],
    answerIndex: 1,
  },
  {
    id: 51,
    question: ['ما هو ثاني مسجد صلى النبي صلى الله عليه وسلم فيه الجمعة؟', 'Vilken var den andra moskén där Profeten Muhammad höll fredagsbön?', 'Which was the second mosque in which the Prophet Muhammad prayed the Friday prayer?'],
    options: [
      ['مسجد قباء', 'Quba-moskén', 'The Quba Mosque'],
      ['مسجد جواثا', 'Jawatha-moskén', 'The Jawatha Mosque'],
      ['المسجد النبوي', 'Profetens moské', 'The Prophet\'s Mosque'],
      ['مسجد القبلتين', 'Moskén med de två qibla', 'The Mosque of the Two Qiblas'],
    ],
    answerIndex: 1,
  },
  {
    id: 52,
    question: ['أين توفيت آمنة بنت وهب أم الرسول صلى الله عليه وسلم؟', 'Var dog Amina bint Wahb, Profeten Muhammads mor?', 'Where did Amina bint Wahb, the mother of the Prophet Muhammad, die?'],
    options: [
      ['في مكة المكرمة', 'I Mecka', 'In Mecca'],
      ['في الأبواء', 'I al-Abwa', 'In al-Abwa'],
      ['في المدينة المنورة', 'I Medina', 'In Medina'],
      ['في الطائف', 'I Taif', 'In Taif'],
    ],
    answerIndex: 1,
  },
  {
    id: 53,
    question: ['كم دامت سنوات خلافة عثمان بن عفان رضي الله عنه؟', 'Hur många år varade Uthman ibn Affans kalifat?', 'How many years did the caliphate of Uthman ibn Affan last?'],
    options: [
      ['10 سنوات', '10 år', '10 years'],
      ['12 سنة', '12 år', '12 years'],
      ['6 سنوات', '6 år', '6 years'],
      ['2 سنتين', '2 år', '2 years'],
    ],
    answerIndex: 1,
  },
  {
    id: 54,
    question: ['ما المسجد الذي استشهد فيه علي بن أبي طالب رضي الله عنه؟', 'I vilken moské blev Ali ibn Abi Talib martyr?', 'In which mosque was Ali ibn Abi Talib martyred?'],
    options: [
      ['المسجد الحرام', 'Den heliga moskén i Mecka', 'The Sacred Mosque in Mecca'],
      ['مسجد الكوفة', 'Kufas moské', 'The Mosque of Kufa'],
      ['المسجد النبوي', 'Profetens moské', 'The Prophet\'s Mosque'],
      ['المسجد الأقصى', 'al-Aqsa-moskén', 'The Al-Aqsa Mosque'],
    ],
    answerIndex: 1,
  },
  {
    id: 55,
    question: ['من الصحابي الذي لقبه الرسول الكريم بالطيب المطيب؟', 'Vilken följeslagare kallade Profeten Muhammad "den gode och renade" (at-tayyib al-mutayyab)?', 'Which companion did the Prophet Muhammad call "the good and the purified" (al-tayyib al-mutayyab)?'],
    options: [
      ['بلال بن رباح', 'Bilal ibn Rabah', 'Bilal ibn Rabah'],
      ['عمار بن ياسر', 'Ammar ibn Yasir', 'Ammar ibn Yasir'],
      ['سلمان الفارسي', 'Salman al-Farisi', 'Salman al-Farisi'],
      ['المقداد بن عمرو', 'al-Miqdad ibn Amr', 'Al-Miqdad ibn Amr'],
    ],
    answerIndex: 1,
  },
  {
    id: 56,
    question: ['ما هو الحج الأصغر؟', 'Vad kallas "den mindre vallfärden"?', 'What is known as the lesser pilgrimage?'],
    options: [
      ['حج الأفراد', 'Enskild hajj', 'Individual hajj'],
      ['العمرة', 'Umra', 'Umra'],
      ['طواف الوداع', 'Avskedstawaf', 'The farewell tawaf'],
      ['الوقوف بعرفة', 'Vistelsen på Arafat', 'Standing at Arafat'],
    ],
    answerIndex: 1,
  },
  {
    id: 57,
    question: ['ما هي أعظم سورة في القرآن الكريم؟', 'Vilken är den största suran i Koranen (i rang)?', 'Which is the greatest surah in the Quran in rank?'],
    options: [
      ['سورة البقرة', 'Surah al-Baqara', 'Surah al-Baqara'],
      ['سورة الفاتحة', 'Surah al-Fatiha', 'Surah al-Fatiha'],
      ['سورة يس', 'Surah Yasin', 'Surah Yasin'],
      ['سورة الإخلاص', 'Surah al-Ikhlas', 'Surah al-Ikhlas'],
    ],
    answerIndex: 1,
  },
  {
    id: 58,
    question: ['ما هي السورة القرأنية التي لا تحوي حرف الميم؟', 'Vilken sura i Koranen innehåller inte bokstaven mim?', 'Which surah of the Quran contains no letter mim?'],
    options: [
      ['سورة النصر', 'Surah an-Nasr', 'Surah al-Nasr'],
      ['سورة الكوثر', 'Surah al-Kawthar', 'Surah al-Kawthar'],
      ['سورة الإخلاص', 'Surah al-Ikhlas', 'Surah al-Ikhlas'],
      ['سورة الفلق', 'Surah al-Falaq', 'Surah al-Falaq'],
    ],
    answerIndex: 1,
  },
  {
    id: 59,
    question: ['من هو الصحابي المشهور بأنه مستجاب الدعاء؟', 'Vilken följeslagare är känd för att hans böner besvarades?', 'Which companion was known for having his supplications answered?'],
    options: [
      ['سعد بن أبي وقاص', 'Sad ibn Abi Waqqas', 'Sad ibn Abi Waqqas'],
      ['أبو هريرة', 'Abu Hurayra', 'Abu Hurayra'],
      ['أنس بن مالك', 'Anas ibn Malik', 'Anas ibn Malik'],
      ['عبد الله بن عمر', 'Abdullah ibn Umar', 'Abdullah ibn Umar'],
    ],
    answerIndex: 0,
  },
  {
    id: 60,
    question: ['ما هي السورة التي تسمى أيضاً بسورة الفاضحة؟', 'Vilken sura kallas även "den avslöjande" (al-fadiha)?', 'Which surah is also called "the exposer" (al-fadiha)?'],
    options: [
      ['سورة المنافقون', 'Surah al-Munafiqun', 'Surah al-Munafiqun'],
      ['سورة التوبة', 'Surah at-Tawba', 'Surah al-Tawba'],
      ['سورة الأحزاب', 'Surah al-Ahzab', 'Surah al-Ahzab'],
      ['سورة النور', 'Surah an-Nur', 'Surah al-Nur'],
    ],
    answerIndex: 1,
  },
  {
    id: 61,
    question: ['في أي غزوة أُسرت الشيماء أخت الرسول صلى الله عليه وسلم من الرضاعة؟', 'I vilket slag tillfångatogs ash-Shayma, Profeten Muhammads dinsyster?', 'In which battle was al-Shayma, the Prophet Muhammad\'s foster sister, taken captive?'],
    options: [
      ['غزوة بدر', 'Slaget vid Badr', 'The Battle of Badr'],
      ['غزوة حنين', 'Slaget vid Hunayn', 'The Battle of Hunayn'],
      ['غزوة أحد', 'Slaget vid Uhud', 'The Battle of Uhud'],
      ['غزوة تبوك', 'Slaget vid Tabuk', 'The Battle of Tabuk'],
    ],
    answerIndex: 1,
  },
  {
    id: 62,
    question: ['من هو الصحابي الملقب بـ (أسد الله)؟', 'Vilken följeslagare kallades "Allahs lejon"?', 'Which companion was called "the Lion of Allah"?'],
    options: [
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
      ['خالد بن الوليد', 'Khalid ibn al-Walid', 'Khalid ibn al-Walid'],
      ['الزبير بن العوام', 'az-Zubayr ibn al-Awwam', 'Al-Zubayr ibn al-Awwam'],
    ],
    answerIndex: 1,
  },
  {
    id: 63,
    question: ['من هو الصحابي الذي اهتز لموته عرش الرحمن؟', 'Vid vilken följeslagares död skakade den Nåderikes tron?', 'At whose death did the Throne of the Most Merciful shake?'],
    options: [
      ['مصعب بن عمير', 'Musab ibn Umayr', 'Musab ibn Umayr'],
      ['سعد بن معاذ', 'Sad ibn Muadh', 'Sad ibn Muadh'],
      ['جعفر بن أبي طالب', 'Jafar ibn Abi Talib', 'Jafar ibn Abi Talib'],
      ['زيد بن حارثة', 'Zayd ibn Haritha', 'Zayd ibn Haritha'],
    ],
    answerIndex: 1,
  },
  {
    id: 64,
    question: ['ما الاسم الحقيقي للنجاشي ملك الحبشة والذي يعني بالعربية (عطية)؟', 'Vad var det verkliga namnet på Negus, Abessiniens kung, som på arabiska betyder "gåva"?', 'What was the real name of the Negus, king of Abyssinia, meaning "gift" in Arabic?'],
    options: [
      ['أصحمة', 'Ashama', 'Ashama'],
      ['هرقل', 'Herakleios', 'Heraclius'],
      ['كسرى', 'Khosrow', 'Khosrow'],
      ['مقوقس', 'Muqawqis', 'Muqawqis'],
    ],
    answerIndex: 0,
  },
  {
    id: 65,
    question: ['من هي الصحابية المجادلة المذكورة في سورة المجادلة؟', 'Vilken kvinnlig följeslagare är den som tvistade i surah al-Mujadala?', 'Which woman companion is the one who pleaded, mentioned in Surah al-Mujadala?'],
    options: [
      ['أسماء بنت عميس', 'Asma bint Umays', 'Asma bint Umays'],
      ['خولة بنت ثعلبة', 'Khawla bint Thalaba', 'Khawla bint Thalaba'],
      ['نسيبة بنت كعب', 'Nusayba bint Kab', 'Nusayba bint Kab'],
      ['أم عطية الأنصارية', 'Umm Atiyya al-Ansariyya', 'Umm Atiyya al-Ansariyya'],
    ],
    answerIndex: 1,
  },
  {
    id: 66,
    question: ['من كان رأس المنافقين وكبيرهم في المدينة المنورة؟', 'Vem var hypokriternas ledare i Medina?', 'Who was the chief of the hypocrites in Medina?'],
    options: [
      ['أبو عامر الراهب', 'Abu Amir munken', 'Abu Amir the monk'],
      ['عبد الله بن أُبي بن سلول', 'Abdullah ibn Ubayy ibn Salul', 'Abdullah ibn Ubayy ibn Salul'],
      ['مسيلمة الكذاب', 'Musaylima lögnaren', 'Musaylima the liar'],
      ['جولاس بن سويد', 'Julas ibn Suwayd', 'Julas ibn Suwayd'],
    ],
    answerIndex: 1,
  },
  {
    id: 67,
    question: ['على من يُطلق لقب (ابن الذبيحين)؟', 'Vem bär tillnamnet "son till de två offrade"?', 'Who bears the title "son of the two who were to be sacrificed"?'],
    options: [
      ['إسماعيل عليه السلام', 'Ismail', 'Ismail'],
      ['الرسول محمد صلى الله عليه وسلم', 'Profeten Muhammad', 'The Prophet Muhammad'],
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['عبد الله بن عبد المطلب', 'Abdullah ibn Abd al-Muttalib', 'Abdullah ibn Abd al-Muttalib'],
    ],
    answerIndex: 1,
  },
  {
    id: 68,
    question: ['كم عدد أبواب جهنم كما ذكر في القرآن؟', 'Hur många portar har helvetet enligt Koranen?', 'How many gates does Hell have according to the Quran?'],
    options: [
      ['8 أبواب', '8 portar', '8 gates'],
      ['7 أبواب', '7 portar', '7 gates'],
      ['12 باباً', '12 portar', '12 gates'],
      ['5 أبواب', '5 portar', '5 gates'],
    ],
    answerIndex: 1,
  },
  {
    id: 69,
    question: ['من هو الغلام الذي كان يرافق السيدة خديجة في تجارتها قبل زواجها بالرسول؟', 'Vilken tjänare följde Khadija i hennes handel före hennes giftermål med Profeten?', 'Which servant accompanied Khadija in her trade before her marriage to the Prophet?'],
    options: [
      ['زيد بن حارثة', 'Zayd ibn Haritha', 'Zayd ibn Haritha'],
      ['ميسرة', 'Maysara', 'Maysara'],
      ['أنس بن مالك', 'Anas ibn Malik', 'Anas ibn Malik'],
      ['بلال بن رباح', 'Bilal ibn Rabah', 'Bilal ibn Rabah'],
    ],
    answerIndex: 1,
  },
  {
    id: 70,
    question: ['أين يوجد قبر نبي الله هود عليه السلام؟', 'Var ligger profeten Huds grav?', 'Where is the grave of the prophet Hud?'],
    options: [
      ['في مكة', 'I Mecka', 'In Mecca'],
      ['في حضرموت', 'I Hadramawt', 'In Hadramawt'],
      ['في القدس', 'I Jerusalem', 'In Jerusalem'],
      ['في دمشق', 'I Damaskus', 'In Damascus'],
    ],
    answerIndex: 1,
  },
  {
    id: 71,
    question: ['من هي أم المؤمنين الملقبة بـ (الصوامة القوامة)؟', 'Vilken av Profetens hustrur kallades "hon som fastade och vakade i bön"?', 'Which of the Prophet\'s wives was called "she who fasted and stood in prayer"?'],
    options: [
      ['عائشة بنت أبي بكر', 'Aisha bint Abi Bakr', 'Aisha bint Abi Bakr'],
      ['حفصة بنت عمر', 'Hafsa bint Umar', 'Hafsa bint Umar'],
      ['سودة بنت زمعة', 'Sawda bint Zama', 'Sawda bint Zama'],
      ['زينب بنت خزيمة', 'Zaynab bint Khuzayma', 'Zaynab bint Khuzayma'],
    ],
    answerIndex: 1,
  },
  {
    id: 72,
    question: ['من الصحابي الذي افتداه الرسول صلى الله عليه وسلم بأبويه يوم أحد؟', 'Vilken följeslagare erbjöd Profeten Muhammad sina egna föräldrar som lösen för vid Uhud?', 'For which companion did the Prophet Muhammad pledge his own parents at Uhud?'],
    options: [
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['سعد بن أبي وقاص', 'Sad ibn Abi Waqqas', 'Sad ibn Abi Waqqas'],
      ['أبو عبيدة الجراح', 'Abu Ubayda al-Jarrah', 'Abu Ubayda al-Jarrah'],
      ['طلحة بن عبيد الله', 'Talha ibn Ubaydillah', 'Talha ibn Ubaydillah'],
    ],
    answerIndex: 1,
  },
  {
    id: 73,
    question: ['أين تقع (الأعراف) التي سميت باسمها سورة في القرآن؟', 'Var ligger al-Araf, som gett namn till en sura i Koranen?', 'Where is al-Araf, after which a surah of the Quran is named?'],
    options: [
      ['في أعلى درجات الجنة', 'I Paradisets högsta nivåer', 'In the highest levels of Paradise'],
      ['بين الجنة والنار', 'Mellan Paradiset och Helvetet', 'Between Paradise and Hell'],
      ['في قاع جهنم', 'På helvetets botten', 'At the bottom of Hell'],
      ['تحت العرش', 'Under Tronen', 'Beneath the Throne'],
    ],
    answerIndex: 1,
  },
  {
    id: 74,
    question: ['ما اسم والدة مريم العذراء عليها السلام؟', 'Vad hette Marias mor?', 'What was the name of the mother of Mary?'],
    options: [
      ['إليصابات', 'Elisabet', 'Elizabeth'],
      ['حنة', 'Hanna', 'Hanna'],
      ['سارة', 'Sara', 'Sarah'],
      ['يوكابد', 'Jokebed', 'Jochebed'],
    ],
    answerIndex: 1,
  },
  {
    id: 75,
    question: ['كم عدد غزوات النبي صلى الله عليه وسلم التي قادها بنفسه؟', 'Hur många fälttåg ledde Profeten Muhammad själv?', 'How many military expeditions did the Prophet Muhammad lead himself?'],
    options: [
      ['19 غزوة', '19 fälttåg', '19 expeditions'],
      ['27 غزوة', '27 fälttåg', '27 expeditions'],
      ['35 غزوة', '35 fälttåg', '35 expeditions'],
      ['15 غزوة', '15 fälttåg', '15 expeditions'],
    ],
    answerIndex: 1,
  },
  {
    id: 76,
    question: ['ما هو أول مسجد بني في الإسلام؟', 'Vilken var den första moskén som byggdes i islam?', 'Which was the first mosque built in Islam?'],
    options: [
      ['المسجد النبوي', 'Profetens moské', 'The Prophet\'s Mosque'],
      ['مسجد قباء', 'Quba-moskén', 'The Quba Mosque'],
      ['المسجد الحرام', 'Den heliga moskén i Mecka', 'The Sacred Mosque in Mecca'],
      ['مسجد القبلتين', 'Moskén med de två qibla', 'The Mosque of the Two Qiblas'],
    ],
    answerIndex: 1,
  },
  {
    id: 77,
    question: ['من هي الصحابية الشجاعة التي استطاعت تخليص أخيها من الأسر؟', 'Vilken modig kvinnlig följeslagare lyckades befria sin bror ur fångenskap?', 'Which brave woman companion managed to free her brother from captivity?'],
    options: [
      ['الخنساء', 'al-Khansa', 'Al-Khansa'],
      ['خولة بنت الأزور', 'Khawla bint al-Azwar', 'Khawla bint al-Azwar'],
      ['أم عمارة', 'Umm Ammara', 'Umm Ammara'],
      ['سفانة بنت حاتم الطائي', 'Safana bint Hatim at-Tai', 'Safana bint Hatim al-Tai'],
    ],
    answerIndex: 1,
  },
  {
    id: 78,
    question: ['في أي سنة هجرية كانت حجة الوداع؟', 'Vilket hijriår ägde avskedsvallfärden rum?', 'In which hijri year did the Farewell Pilgrimage take place?'],
    options: [
      ['8 هـ', 'År 8 e.H.', '8 AH'],
      ['10 هـ', 'År 10 e.H.', '10 AH'],
      ['9 هـ', 'År 9 e.H.', '9 AH'],
      ['11 هـ', 'År 11 e.H.', '11 AH'],
    ],
    answerIndex: 1,
  },
  {
    id: 79,
    question: ['كم عدد الرسل والأنبياء الذين ذكروا بأسمائهم صراحة في القرآن الكريم؟', 'Hur många sändebud och profeter nämns med namn i Koranen?', 'How many messengers and prophets are named explicitly in the Quran?'],
    options: [
      ['20 رسولاً ونبياً', '20 sändebud och profeter', '20 messengers and prophets'],
      ['25 رسولاً ونبياً', '25 sändebud och profeter', '25 messengers and prophets'],
      ['30 رسولاً ونبياً', '30 sändebud och profeter', '30 messengers and prophets'],
      ['12 رسولاً ونبياً', '12 sändebud och profeter', '12 messengers and prophets'],
    ],
    answerIndex: 1,
  },
  {
    id: 80,
    question: ['من الصحابي الذي أوتي مزماراً من مزامير آل داوود لحسن صوته؟', 'Vilken följeslagare fick "en flöjt ur Davids hus" för sin vackra röst?', 'Which companion was given "a flute of the house of David" for the beauty of his voice?'],
    options: [
      ['عبد الله بن مسعود', 'Abdullah ibn Masud', 'Abdullah ibn Masud'],
      ['أبو موسى الأشعري', 'Abu Musa al-Ashari', 'Abu Musa al-Ashari'],
      ['أبي بن كعب', 'Ubayy ibn Kab', 'Ubayy ibn Kab'],
      ['زيد بن ثابت', 'Zayd ibn Thabit', 'Zayd ibn Thabit'],
    ],
    answerIndex: 1,
  },
  {
    id: 81,
    question: ['أين توفي الصحابي الجليل بلال بن رباح مؤذن الرسول؟', 'Var dog Bilal ibn Rabah, Profetens böneutropare?', 'Where did Bilal ibn Rabah, the Prophet\'s caller to prayer, die?'],
    options: [
      ['في المدينة المنورة', 'I Medina', 'In Medina'],
      ['في دمشق', 'I Damaskus', 'In Damascus'],
      ['في مكة المكرمة', 'I Mecka', 'In Mecca'],
      ['في القدس', 'I Jerusalem', 'In Jerusalem'],
    ],
    answerIndex: 1,
  },
  {
    id: 82,
    question: ['من التي أشارت على الرسول صلى الله عليه وسلم بالحلحلة والذبح يوم الحديبية؟', 'Vem rådde Profeten Muhammad att raka huvudet och offra vid Hudaybiyya?', 'Who advised the Prophet Muhammad to shave his head and sacrifice at Hudaybiyya?'],
    options: [
      ['عائشة بنت أبي بكر', 'Aisha bint Abi Bakr', 'Aisha bint Abi Bakr'],
      ['أم سلمة', 'Umm Salama', 'Umm Salama'],
      ['حفصة بنت عمر', 'Hafsa bint Umar', 'Hafsa bint Umar'],
      ['ميمونة بنت الحارث', 'Maymuna bint al-Harith', 'Maymuna bint al-Harith'],
    ],
    answerIndex: 1,
  },
  {
    id: 83,
    question: ['من الصحابي الذي كان يُلقب بـ (بحر الجود) لشدة كرمه؟', 'Vilken följeslagare kallades "generositetens hav" för sin givmildhet?', 'Which companion was called "the ocean of generosity"?'],
    options: [
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['عبد الله بن جعفر', 'Abdullah ibn Jafar', 'Abdullah ibn Jafar'],
      ['طلحة بن عبيد الله', 'Talha ibn Ubaydillah', 'Talha ibn Ubaydillah'],
      ['عبد الرحمن بن عوف', 'Abd ar-Rahman ibn Awf', 'Abd al-Rahman ibn Awf'],
    ],
    answerIndex: 1,
  },
  {
    id: 84,
    question: ['من هو النبي الذي آمن به جميع قومه ولم يكذبه أحد؟', 'Vilken profet trodde hela hans folk på, utan att någon förnekade honom?', 'Which prophet was believed by all of his people, with none denying him?'],
    options: [
      ['صالح عليه السلام', 'Salih', 'Salih'],
      ['يونس عليه السلام', 'Yunus (Jona)', 'Yunus (Jonah)'],
      ['هود عليه السلام', 'Hud', 'Hud'],
      ['لوط عليه السلام', 'Lut (Lot)', 'Lut (Lot)'],
    ],
    answerIndex: 1,
  },
  {
    id: 85,
    question: ['من هو الصحابي الجليل الذي لقب بـ (ذي النورين)؟', 'Vilken följeslagare kallades "han med de två ljusen" (Dhun-Nurayn)?', 'Which companion was called "the possessor of two lights" (Dhu al-Nurayn)?'],
    options: [
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
    ],
    answerIndex: 1,
  },
  {
    id: 86,
    question: ['كم عدة المرأة المتوفى عنها زوجها شرعاً؟', 'Hur lång är väntetiden (idda) för en kvinna vars make har avlidit?', 'How long is the waiting period (idda) for a woman whose husband has died?'],
    options: [
      ['3 أشهر', '3 månader', '3 months'],
      ['أربعة أشهر وعشرة أيام', 'Fyra månader och tio dagar', 'Four months and ten days'],
      ['100 يوم', '100 dagar', '100 days'],
      ['سنة كاملة', 'Ett helt år', 'A full year'],
    ],
    answerIndex: 1,
  },
  {
    id: 87,
    question: ['ما اسم خازن الجنة؟', 'Vad heter Paradisets vaktare?', 'What is the name of the keeper of Paradise?'],
    options: [
      ['مالك', 'Malik', 'Malik'],
      ['رضوان', 'Ridwan', 'Ridwan'],
      ['إسرافيل', 'Israfil', 'Israfil'],
      ['عزرائيل', 'Azrail', 'Azrail'],
    ],
    answerIndex: 1,
  },
  {
    id: 88,
    question: ['ما اسم خازن النار؟', 'Vad heter Helvetets vaktare?', 'What is the name of the keeper of the Fire?'],
    options: [
      ['رضوان', 'Ridwan', 'Ridwan'],
      ['مالك', 'Malik', 'Malik'],
      ['منكر', 'Munkar', 'Munkar'],
      ['نكير', 'Nakir', 'Nakir'],
    ],
    answerIndex: 1,
  },
  {
    id: 89,
    question: ['ما هما السورتان اللتان تسمى كل منهما بـ (الزهراوان)؟', 'Vilka två suror kallas var för sig "de två strålande" (az-Zahrawan)?', 'Which two surahs are each called "the two luminous ones" (al-Zahrawan)?'],
    options: [
      ['الأنعام والأعراف', 'al-Anam och al-Araf', 'Al-Anam and al-Araf'],
      ['البقرة وآل عمران', 'al-Baqara och Ali Imran', 'Al-Baqara and Ali Imran'],
      ['الإسراء والكهف', 'al-Isra och al-Kahf', 'Al-Isra and al-Kahf'],
      ['يس والواقعة', 'Yasin och al-Waqia', 'Yasin and al-Waqia'],
    ],
    answerIndex: 1,
  },
  {
    id: 90,
    question: ['ما هي السورة التي كانت سبباً مباشراً في إسلام عمر بن الخطاب؟', 'Vilken sura var den direkta orsaken till att Umar ibn al-Khattab antog islam?', 'Which surah was the direct cause of Umar ibn al-Khattab\'s acceptance of Islam?'],
    options: [
      ['سورة يس', 'Surah Yasin', 'Surah Yasin'],
      ['سورة طه', 'Surah Taha', 'Surah Taha'],
      ['سورة الرحمن', 'Surah ar-Rahman', 'Surah al-Rahman'],
      ['سورة النجم', 'Surah an-Najm', 'Surah al-Najm'],
    ],
    answerIndex: 1,
  },
  {
    id: 91,
    question: ['ما السورة التي تُلقب بـ (عروس القرآن)؟', 'Vilken sura kallas "Koranens brud"?', 'Which surah is called "the bride of the Quran"?'],
    options: [
      ['سورة يس', 'Surah Yasin', 'Surah Yasin'],
      ['سورة الرحمن', 'Surah ar-Rahman', 'Surah al-Rahman'],
      ['سورة الملك', 'Surah al-Mulk', 'Surah al-Mulk'],
      ['سورة الواقعة', 'Surah al-Waqia', 'Surah al-Waqia'],
    ],
    answerIndex: 1,
  },
  {
    id: 92,
    question: ['ما السورة التي تُلقب بـ (قلب القرآن)؟', 'Vilken sura kallas "Koranens hjärta"?', 'Which surah is called "the heart of the Quran"?'],
    options: [
      ['سورة الرحمن', 'Surah ar-Rahman', 'Surah al-Rahman'],
      ['سورة يس', 'Surah Yasin', 'Surah Yasin'],
      ['سورة الفاتحة', 'Surah al-Fatiha', 'Surah al-Fatiha'],
      ['سورة الإخلاص', 'Surah al-Ikhlas', 'Surah al-Ikhlas'],
    ],
    answerIndex: 1,
  },
  {
    id: 93,
    question: ['من الصحابي الذي سلّمه النبي مفتاح الكعبة عند فتح مكة وقال: (خُذُوهَا خَالِدَةً تَالِدَةً)؟', 'Vilken följeslagare gav Profeten nyckeln till Kaba vid Meckas erövring med orden "tag den för alltid"?', 'To which companion did the Prophet hand the key of the Kaaba at the conquest of Mecca, saying "take it for all time"?'],
    options: [
      ['شيبة بن عثمان', 'Shayba ibn Uthman', 'Shayba ibn Uthman'],
      ['عثمان بن طلحة', 'Uthman ibn Talha', 'Uthman ibn Talha'],
      ['العباس بن عبد المطلب', 'al-Abbas ibn Abd al-Muttalib', 'Al-Abbas ibn Abd al-Muttalib'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
    ],
    answerIndex: 1,
  },
  {
    id: 94,
    question: ['من الصحابي الذي قال له الرسول صلى الله عليه وسلم: (ربح البيع أبا يحيى)؟', 'Till vilken följeslagare sade Profeten Muhammad: "Vilken god handel du gjort, Abu Yahya"?', 'To which companion did the Prophet Muhammad say: "What a profitable trade, Abu Yahya"?'],
    options: [
      ['مصعب بن عمير', 'Musab ibn Umayr', 'Musab ibn Umayr'],
      ['صهيب بن سنان (صهيب الرومي)', 'Suhayb ibn Sinan (Suhayb ar-Rumi)', 'Suhayb ibn Sinan (Suhayb al-Rumi)'],
      ['سلمان الفارسي', 'Salman al-Farisi', 'Salman al-Farisi'],
      ['أبو ذر الغفاري', 'Abu Dharr al-Ghifari', 'Abu Dharr al-Ghifari'],
    ],
    answerIndex: 1,
  },
  {
    id: 95,
    question: ['من الصحابي الذي دعا له النبي بقوله: (اللهم فقهه في الدين وعلمه التأويل)؟', 'För vilken följeslagare bad Profeten: "Allah, ge honom insikt i religionen och lär honom tolkningen"?', 'For which companion did the Prophet pray: "O Allah, give him understanding of the religion and teach him interpretation"?'],
    options: [
      ['عبد الله بن عمر', 'Abdullah ibn Umar', 'Abdullah ibn Umar'],
      ['عبد الله بن عباس', 'Abdullah ibn Abbas', 'Abdullah ibn Abbas'],
      ['عبد الله بن مسعود', 'Abdullah ibn Masud', 'Abdullah ibn Masud'],
      ['زيد بن ثابت', 'Zayd ibn Thabit', 'Zayd ibn Thabit'],
    ],
    answerIndex: 1,
  },
  {
    id: 96,
    question: ['ما هي أطول سورة في القرآن الكريم؟', 'Vilken är den längsta suran i Koranen?', 'Which is the longest surah in the Quran?'],
    options: [
      ['سورة آل عمران', 'Surah Ali Imran', 'Surah Ali Imran'],
      ['سورة البقرة', 'Surah al-Baqara', 'Surah al-Baqara'],
      ['سورة النساء', 'Surah an-Nisa', 'Surah al-Nisa'],
      ['سورة المائدة', 'Surah al-Maida', 'Surah al-Maida'],
    ],
    answerIndex: 1,
  },
  {
    id: 97,
    question: ['ما هي أقصر سورة في القرآن الكريم؟', 'Vilken är den kortaste suran i Koranen?', 'Which is the shortest surah in the Quran?'],
    options: [
      ['سورة الإخلاص', 'Surah al-Ikhlas', 'Surah al-Ikhlas'],
      ['سورة الكوثر', 'Surah al-Kawthar', 'Surah al-Kawthar'],
      ['سورة النصر', 'Surah an-Nasr', 'Surah al-Nasr'],
      ['سورة العصر', 'Surah al-Asr', 'Surah al-Asr'],
    ],
    answerIndex: 1,
  },
  {
    id: 98,
    question: ['من هو شاعر الرسول صلى الله عليه وسلم الذي كان يدفع عن الإسلام بلسانه؟', 'Vem var Profeten Muhammads poet, som försvarade islam med sin tunga?', 'Who was the poet of the Prophet Muhammad, defending Islam with his tongue?'],
    options: [
      ['كعب بن مالك', 'Kab ibn Malik', 'Kab ibn Malik'],
      ['حسان بن ثابت', 'Hassan ibn Thabit', 'Hassan ibn Thabit'],
      ['عبد الله بن رواحة', 'Abdullah ibn Rawaha', 'Abdullah ibn Rawaha'],
      ['النابغة الجعدي', 'an-Nabigha al-Jadi', 'Al-Nabigha al-Jadi'],
    ],
    answerIndex: 1,
  },
  {
    id: 99,
    question: ['من هو الصحابي الملقب بـ (الشهيد الحي)؟', 'Vilken följeslagare kallades "den levande martyren"?', 'Which companion was called "the living martyr"?'],
    options: [
      ['سعد بن معاذ', 'Sad ibn Muadh', 'Sad ibn Muadh'],
      ['طلحة بن عبيد الله', 'Talha ibn Ubaydillah', 'Talha ibn Ubaydillah'],
      ['جعفر بن أبي طالب', 'Jafar ibn Abi Talib', 'Jafar ibn Abi Talib'],
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
    ],
    answerIndex: 1,
  },

  // ——— Påfyllnad: Koranen ———
  {
    id: 100,
    question: ['كم عدد سور القرآن الكريم؟', 'Hur många suror finns det i Koranen?', 'How many surahs are there in the Quran?'],
    options: [
      ['113 سورة', '113 suror', '113 surahs'],
      ['114 سورة', '114 suror', '114 surahs'],
      ['116 سورة', '116 suror', '116 surahs'],
      ['120 سورة', '120 suror', '120 surahs'],
    ],
    answerIndex: 1,
  },
  {
    id: 101,
    question: ['كم عدد أجزاء القرآن الكريم؟', 'Hur många delar (juz) är Koranen indelad i?', 'Into how many parts (juz) is the Quran divided?'],
    options: [
      ['30 جزءاً', '30 delar', '30 parts'],
      ['60 جزءاً', '60 delar', '60 parts'],
      ['20 جزءاً', '20 delar', '20 parts'],
      ['40 جزءاً', '40 delar', '40 parts'],
    ],
    answerIndex: 0,
  },
  {
    id: 102,
    question: ['ما أطول آية في القرآن الكريم؟', 'Vilken är den längsta versen i Koranen?', 'Which is the longest verse in the Quran?'],
    options: [
      ['آية الكرسي', 'Tronversen (Ayat al-Kursi)', 'The Verse of the Throne (Ayat al-Kursi)'],
      ['آية الدين', 'Skuldversen (Ayat ad-Dayn)', 'The Verse of Debt (Ayat al-Dayn)'],
      ['آية المواريث', 'Arvsversen', 'The Verse of Inheritance'],
      ['آية الوضوء', 'Versen om tvagning', 'The Verse of Ablution'],
    ],
    answerIndex: 1,
  },
  {
    id: 103,
    question: ['ما هي السورة التي تعدل ثلث القرآن؟', 'Vilken sura motsvarar en tredjedel av Koranen?', 'Which surah is equal to a third of the Quran?'],
    options: [
      ['سورة الفاتحة', 'Surah al-Fatiha', 'Surah al-Fatiha'],
      ['سورة الإخلاص', 'Surah al-Ikhlas', 'Surah al-Ikhlas'],
      ['سورة الكوثر', 'Surah al-Kawthar', 'Surah al-Kawthar'],
      ['سورة الفلق', 'Surah al-Falaq', 'Surah al-Falaq'],
    ],
    answerIndex: 1,
  },
  {
    id: 104,
    question: ['ما هي السورة الوحيدة التي لم تبدأ بالبسملة؟', 'Vilken är den enda sura som inte inleds med basmala?', 'Which is the only surah that does not begin with the basmala?'],
    options: [
      ['سورة التوبة', 'Surah at-Tawba', 'Surah al-Tawba'],
      ['سورة الأنفال', 'Surah al-Anfal', 'Surah al-Anfal'],
      ['سورة الحجر', 'Surah al-Hijr', 'Surah al-Hijr'],
      ['سورة ص', 'Surah Sad', 'Surah Sad'],
    ],
    answerIndex: 0,
  },
  {
    id: 105,
    question: ['ما هي أول آية نزلت من القرآن الكريم؟', 'Vilken var den första versen som uppenbarades i Koranen?', 'Which was the first verse revealed of the Quran?'],
    options: [
      ['الحمد لله رب العالمين', 'Lov och pris tillkommer Allah, världarnas Herre', 'All praise belongs to Allah, Lord of the worlds'],
      ['اقرأ باسم ربك الذي خلق', 'Läs i din Herres namn, Han som har skapat', 'Read in the name of your Lord who created'],
      ['يا أيها المدثر قم فأنذر', 'Du som är höljd i din mantel, stig upp och varna', 'O you who are wrapped in a cloak, arise and warn'],
      ['بسم الله الرحمن الرحيم', 'I Allahs namn, den Nåderike, den Barmhärtige', 'In the name of Allah, the Most Gracious, the Most Merciful'],
    ],
    answerIndex: 1,
  },
  {
    id: 106,
    question: ['كم عدد آيات سورة الفاتحة؟', 'Hur många verser har surah al-Fatiha?', 'How many verses does Surah al-Fatiha have?'],
    options: [
      ['5 آيات', '5 verser', '5 verses'],
      ['7 آيات', '7 verser', '7 verses'],
      ['9 آيات', '9 verser', '9 verses'],
      ['11 آية', '11 verser', '11 verses'],
    ],
    answerIndex: 1,
  },
  {
    id: 107,
    question: ['ما السورة التي يستحب قراءتها يوم الجمعة؟', 'Vilken sura rekommenderas att läsa på fredagen?', 'Which surah is recommended to recite on Friday?'],
    options: [
      ['سورة الكهف', 'Surah al-Kahf', 'Surah al-Kahf'],
      ['سورة يوسف', 'Surah Yusuf', 'Surah Yusuf'],
      ['سورة النور', 'Surah an-Nur', 'Surah al-Nur'],
      ['سورة الحج', 'Surah al-Hajj', 'Surah al-Hajj'],
    ],
    answerIndex: 0,
  },
  {
    id: 108,
    question: ['ما السورة التي تُلقب بـ (المانعة) وتُقرأ قبل النوم؟', 'Vilken sura kallas "den skyddande" och läses före sömnen?', 'Which surah is called "the protector" and is recited before sleep?'],
    options: [
      ['سورة الملك', 'Surah al-Mulk', 'Surah al-Mulk'],
      ['سورة القلم', 'Surah al-Qalam', 'Surah al-Qalam'],
      ['سورة نوح', 'Surah Nuh', 'Surah Nuh'],
      ['سورة الجن', 'Surah al-Jinn', 'Surah al-Jinn'],
    ],
    answerIndex: 0,
  },
  {
    id: 109,
    question: ['ما اسم الشهر الذي أنزل فيه القرآن؟', 'I vilken månad uppenbarades Koranen?', 'In which month was the Quran revealed?'],
    options: [
      ['شعبان', 'Shaban', 'Shaban'],
      ['رمضان', 'Ramadan', 'Ramadan'],
      ['محرم', 'Muharram', 'Muharram'],
      ['رجب', 'Rajab', 'Rajab'],
    ],
    answerIndex: 1,
  },
  {
    id: 110,
    question: ['ما اسم الليلة التي أنزل فيها القرآن؟', 'Vad heter natten då Koranen uppenbarades?', 'What is the name of the night on which the Quran was revealed?'],
    options: [
      ['ليلة الإسراء', 'Natten för himmelsfärden', 'The Night of the Ascension'],
      ['ليلة القدر', 'Ödets natt (Laylat al-Qadr)', 'The Night of Decree (Laylat al-Qadr)'],
      ['ليلة النصف من شعبان', 'Natten mitt i Shaban', 'The night in the middle of Shaban'],
      ['ليلة الجمعة', 'Fredagsnatten', 'Friday night'],
    ],
    answerIndex: 1,
  },
  {
    id: 111,
    question: ['من هي المرأة الوحيدة التي ذُكر اسمها صريحاً في القرآن الكريم؟', 'Vilken kvinna är den enda som nämns vid namn i Koranen?', 'Which woman is the only one named explicitly in the Quran?'],
    options: [
      ['خديجة', 'Khadija', 'Khadija'],
      ['مريم', 'Maria (Maryam)', 'Mary (Maryam)'],
      ['آسيا', 'Asiya', 'Asiya'],
      ['سارة', 'Sara', 'Sarah'],
    ],
    answerIndex: 1,
  },
  {
    id: 112,
    question: ['ما هي السورتان اللتان تسميان بـ (المعوذتين)؟', 'Vilka två suror kallas "de två tillflyktssurorna" (al-Muawwidhatayn)?', 'Which two surahs are called the two surahs of refuge (al-Muawwidhatayn)?'],
    options: [
      ['الفلق والناس', 'al-Falaq och an-Nas', 'Al-Falaq and al-Nas'],
      ['الإخلاص والفلق', 'al-Ikhlas och al-Falaq', 'Al-Ikhlas and al-Falaq'],
      ['الكوثر والنصر', 'al-Kawthar och an-Nasr', 'Al-Kawthar and al-Nasr'],
      ['العصر والفيل', 'al-Asr och al-Fil', 'Al-Asr and al-Fil'],
    ],
    answerIndex: 0,
  },
  {
    id: 113,
    question: ['ما اسم أول سورة في المصحف الشريف؟', 'Vilken är den första suran i Koranen?', 'Which is the first surah in the Quran?'],
    options: [
      ['البقرة', 'al-Baqara', 'Al-Baqara'],
      ['الفاتحة', 'al-Fatiha', 'Al-Fatiha'],
      ['العلق', 'al-Alaq', 'Al-Alaq'],
      ['الناس', 'an-Nas', 'Al-Nas'],
    ],
    answerIndex: 1,
  },
  {
    id: 114,
    question: ['ما اسم آخر سورة في المصحف الشريف؟', 'Vilken är den sista suran i Koranen?', 'Which is the last surah in the Quran?'],
    options: [
      ['الإخلاص', 'al-Ikhlas', 'Al-Ikhlas'],
      ['الناس', 'an-Nas', 'Al-Nas'],
      ['الفلق', 'al-Falaq', 'Al-Falaq'],
      ['النصر', 'an-Nasr', 'Al-Nasr'],
    ],
    answerIndex: 1,
  },

  // ——— Påfyllnad: Trosläran och ibadat ———
  {
    id: 115,
    question: ['كم عدد أركان الإسلام؟', 'Hur många är islams pelare?', 'How many are the pillars of Islam?'],
    options: [
      ['أربعة', 'Fyra', 'Four'],
      ['خمسة', 'Fem', 'Five'],
      ['ستة', 'Sex', 'Six'],
      ['سبعة', 'Sju', 'Seven'],
    ],
    answerIndex: 1,
  },
  {
    id: 116,
    question: ['كم عدد أركان الإيمان؟', 'Hur många är trons pelare?', 'How many are the pillars of faith?'],
    options: [
      ['خمسة', 'Fem', 'Five'],
      ['ستة', 'Sex', 'Six'],
      ['سبعة', 'Sju', 'Seven'],
      ['ثمانية', 'Åtta', 'Eight'],
    ],
    answerIndex: 1,
  },
  {
    id: 117,
    question: ['كم عدد الصلوات المفروضة في اليوم والليلة؟', 'Hur många obligatoriska böner finns det per dygn?', 'How many obligatory prayers are there each day and night?'],
    options: [
      ['ثلاث صلوات', 'Tre böner', 'Three prayers'],
      ['خمس صلوات', 'Fem böner', 'Five prayers'],
      ['ست صلوات', 'Sex böner', 'Six prayers'],
      ['سبع صلوات', 'Sju böner', 'Seven prayers'],
    ],
    answerIndex: 1,
  },
  {
    id: 118,
    question: ['كم عدد ركعات صلاة المغرب؟', 'Hur många raka har maghribbönen?', 'How many rakas does the Maghrib prayer have?'],
    options: [
      ['ركعتان', 'Två raka', 'Two rakas'],
      ['ثلاث ركعات', 'Tre raka', 'Three rakas'],
      ['أربع ركعات', 'Fyra raka', 'Four rakas'],
      ['خمس ركعات', 'Fem raka', 'Five rakas'],
    ],
    answerIndex: 1,
  },
  {
    id: 119,
    question: ['ما مقدار زكاة المال (النقود) عند بلوغ النصاب وحولان الحول؟', 'Hur stor är zakat på pengar när nisab uppnåtts och ett år gått?', 'What is the rate of zakat on money once the nisab is reached and a year has passed?'],
    options: [
      ['العشر', 'En tiondel', 'One tenth'],
      ['ربع العشر (2.5%)', 'En fjärdedel av en tiondel (2,5 %)', 'A quarter of a tenth (2.5%)'],
      ['نصف العشر', 'Halva tiondelen', 'Half of a tenth'],
      ['الخمس', 'En femtedel', 'One fifth'],
    ],
    answerIndex: 1,
  },
  {
    id: 120,
    question: ['ما أول ما يحاسب عليه العبد يوم القيامة من العبادات؟', 'Vilken gudstjänsthandling ställs människan först till svars för på Domedagen?', 'Which act of worship is a person first held to account for on the Day of Judgement?'],
    options: [
      ['الزكاة', 'Zakat', 'Zakat'],
      ['الصلاة', 'Bönen', 'The prayer'],
      ['الصيام', 'Fastan', 'The fast'],
      ['الحج', 'Vallfärden', 'The pilgrimage'],
    ],
    answerIndex: 1,
  },
  {
    id: 121,
    question: ['كم عدد أبواب الجنة؟', 'Hur många portar har Paradiset?', 'How many gates does Paradise have?'],
    options: [
      ['سبعة أبواب', 'Sju portar', 'Seven gates'],
      ['ثمانية أبواب', 'Åtta portar', 'Eight gates'],
      ['عشرة أبواب', 'Tio portar', 'Ten gates'],
      ['اثنا عشر باباً', 'Tolv portar', 'Twelve gates'],
    ],
    answerIndex: 1,
  },
  {
    id: 122,
    question: ['ما أعلى درجات الجنة؟', 'Vilken är Paradisets högsta nivå?', 'Which is the highest level of Paradise?'],
    options: [
      ['جنة النعيم', 'Jannat an-Naim', 'Jannat al-Naim'],
      ['الفردوس الأعلى', 'Det högsta Firdaws', 'The highest Firdaws'],
      ['جنة عدن', 'Jannat Adn', 'Jannat Adn'],
      ['دار السلام', 'Dar as-Salam', 'Dar al-Salam'],
    ],
    answerIndex: 1,
  },
  {
    id: 123,
    question: ['كم عدد الأشهر الحرم؟', 'Hur många är de heliga månaderna?', 'How many are the sacred months?'],
    options: [
      ['شهران', 'Två månader', 'Two months'],
      ['ثلاثة أشهر', 'Tre månader', 'Three months'],
      ['أربعة أشهر', 'Fyra månader', 'Four months'],
      ['ستة أشهر', 'Sex månader', 'Six months'],
    ],
    answerIndex: 2,
  },
  {
    id: 124,
    question: ['كم عدد أشواط الطواف حول الكعبة؟', 'Hur många varv går man runt Kaba under tawaf?', 'How many circuits are made around the Kaaba in tawaf?'],
    options: [
      ['ثلاثة أشواط', 'Tre varv', 'Three circuits'],
      ['خمسة أشواط', 'Fem varv', 'Five circuits'],
      ['سبعة أشواط', 'Sju varv', 'Seven circuits'],
      ['تسعة أشواط', 'Nio varv', 'Nine circuits'],
    ],
    answerIndex: 2,
  },
  {
    id: 125,
    question: ['بين أي جبلين يكون السعي في الحج والعمرة؟', 'Mellan vilka två kullar utförs saj under hajj och umra?', 'Between which two hills is the say performed during hajj and umra?'],
    options: [
      ['الصفا والمروة', 'as-Safa och al-Marwa', 'Al-Safa and al-Marwa'],
      ['أحد وعرفات', 'Uhud och Arafat', 'Uhud and Arafat'],
      ['ثور وحراء', 'Thawr och Hira', 'Thawr and Hira'],
      ['قبيس والنور', 'Qubays och an-Nur', 'Qubays and al-Nur'],
    ],
    answerIndex: 0,
  },
  {
    id: 126,
    question: ['في أي يوم من ذي الحجة يكون يوم عرفة؟', 'Vilken dag i Dhul-Hijja är Arafatdagen?', 'Which day of Dhul-Hijja is the Day of Arafat?'],
    options: [
      ['اليوم الثامن', 'Den åttonde dagen', 'The eighth day'],
      ['اليوم التاسع', 'Den nionde dagen', 'The ninth day'],
      ['اليوم العاشر', 'Den tionde dagen', 'The tenth day'],
      ['اليوم الحادي عشر', 'Den elfte dagen', 'The eleventh day'],
    ],
    answerIndex: 1,
  },
  {
    id: 127,
    question: ['ما اسم البئر التي تفجرت لهاجر وإسماعيل عليه السلام؟', 'Vad heter källan som sprang fram för Hagar och Ismail?', 'What is the name of the well that sprang forth for Hagar and Ismail?'],
    options: [
      ['بئر زمزم', 'Zamzam', 'Zamzam'],
      ['بئر بدر', 'Badr', 'Badr'],
      ['بئر معونة', 'Mauna', 'Mauna'],
      ['بئر أريس', 'Aris', 'Aris'],
    ],
    answerIndex: 0,
  },
  {
    id: 128,
    question: ['ما هي القبلة الأولى للمسلمين قبل تحويلها إلى الكعبة؟', 'Vilken var muslimernas första qibla, innan den vändes mot Kaba?', 'Which was the Muslims\' first qibla, before it was turned toward the Kaaba?'],
    options: [
      ['المسجد الأقصى', 'al-Aqsa-moskén', 'The Al-Aqsa Mosque'],
      ['مسجد قباء', 'Quba-moskén', 'The Quba Mosque'],
      ['المسجد النبوي', 'Profetens moské', 'The Prophet\'s Mosque'],
      ['جبل الطور', 'Berget Sinai', 'Mount Sinai'],
    ],
    answerIndex: 0,
  },

  // ——— Påfyllnad: Profeterna och änglarna ———
  {
    id: 129,
    question: ['من هو الملك الموكل بالوحي؟', 'Vilken ängel är anförtrodd uppenbarelsen?', 'Which angel is entrusted with revelation?'],
    options: [
      ['ميكائيل عليه السلام', 'Mikail (Mikael)', 'Mikail (Michael)'],
      ['جبريل عليه السلام', 'Jibril (Gabriel)', 'Jibril (Gabriel)'],
      ['إسرافيل عليه السلام', 'Israfil', 'Israfil'],
      ['مالك', 'Malik', 'Malik'],
    ],
    answerIndex: 1,
  },
  {
    id: 130,
    question: ['من هو الملك الموكل بالمطر والنبات؟', 'Vilken ängel är anförtrodd regnet och växtligheten?', 'Which angel is entrusted with rain and vegetation?'],
    options: [
      ['جبريل عليه السلام', 'Jibril (Gabriel)', 'Jibril (Gabriel)'],
      ['ميكائيل عليه السلام', 'Mikail (Mikael)', 'Mikail (Michael)'],
      ['إسرافيل عليه السلام', 'Israfil', 'Israfil'],
      ['رضوان', 'Ridwan', 'Ridwan'],
    ],
    answerIndex: 1,
  },
  {
    id: 131,
    question: ['من هو الملك الموكل بالنفخ في الصور؟', 'Vilken ängel är anförtrodd att blåsa i hornet?', 'Which angel is entrusted with blowing the trumpet?'],
    options: [
      ['إسرافيل عليه السلام', 'Israfil', 'Israfil'],
      ['جبريل عليه السلام', 'Jibril (Gabriel)', 'Jibril (Gabriel)'],
      ['ميكائيل عليه السلام', 'Mikail (Mikael)', 'Mikail (Michael)'],
      ['منكر', 'Munkar', 'Munkar'],
    ],
    answerIndex: 0,
  },
  {
    id: 132,
    question: ['من هو النبي الملقب بـ (كليم الله)؟', 'Vilken profet kallas "den Allah talade med" (Kalimullah)?', 'Which prophet is called "the one Allah spoke to" (Kalimullah)?'],
    options: [
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
      ['عيسى عليه السلام', 'Isa (Jesus)', 'Isa (Jesus)'],
      ['نوح عليه السلام', 'Nuh (Noa)', 'Nuh (Noah)'],
    ],
    answerIndex: 1,
  },
  {
    id: 133,
    question: ['من هو النبي الملقب بـ (خليل الله)؟', 'Vilken profet kallas "Allahs vän" (Khalilullah)?', 'Which prophet is called "the friend of Allah" (Khalilullah)?'],
    options: [
      ['إبراهيم عليه السلام', 'Ibrahim', 'Ibrahim'],
      ['إسماعيل عليه السلام', 'Ismail', 'Ismail'],
      ['يعقوب عليه السلام', 'Yaqub (Jakob)', 'Yaqub (Jacob)'],
      ['إدريس عليه السلام', 'Idris', 'Idris'],
    ],
    answerIndex: 0,
  },
  {
    id: 134,
    question: ['من هو النبي الذي ابتلعه الحوت؟', 'Vilken profet slukades av valfisken?', 'Which prophet was swallowed by the whale?'],
    options: [
      ['يونس عليه السلام', 'Yunus (Jona)', 'Yunus (Jonah)'],
      ['يوسف عليه السلام', 'Yusuf (Josef)', 'Yusuf (Joseph)'],
      ['أيوب عليه السلام', 'Ayyub (Job)', 'Ayyub (Job)'],
      ['صالح عليه السلام', 'Salih', 'Salih'],
    ],
    answerIndex: 0,
  },
  {
    id: 135,
    question: ['من هو النبي الذي بنى السفينة بأمر الله؟', 'Vilken profet byggde arken på Allahs befallning?', 'Which prophet built the ark by Allah\'s command?'],
    options: [
      ['هود عليه السلام', 'Hud', 'Hud'],
      ['نوح عليه السلام', 'Nuh (Noa)', 'Nuh (Noah)'],
      ['لوط عليه السلام', 'Lut (Lot)', 'Lut (Lot)'],
      ['شعيب عليه السلام', 'Shuayb', 'Shuayb'],
    ],
    answerIndex: 1,
  },
  {
    id: 136,
    question: ['من هو النبي الذي عُرف بالصبر على البلاء؟', 'Vilken profet är känd för sitt tålamod i prövning?', 'Which prophet is known for his patience through affliction?'],
    options: [
      ['أيوب عليه السلام', 'Ayyub (Job)', 'Ayyub (Job)'],
      ['يعقوب عليه السلام', 'Yaqub (Jakob)', 'Yaqub (Jacob)'],
      ['إلياس عليه السلام', 'Ilyas (Elia)', 'Ilyas (Elijah)'],
      ['ذو الكفل عليه السلام', 'Dhul-Kifl', 'Dhul-Kifl'],
    ],
    answerIndex: 0,
  },
  {
    id: 137,
    question: ['من هو النبي الذي سُخرت له الجن والريح؟', 'Vilken profet fick jinnerna och vinden underställda sig?', 'Which prophet had the jinn and the wind placed at his service?'],
    options: [
      ['داوود عليه السلام', 'Dawud (David)', 'Dawud (David)'],
      ['سليمان عليه السلام', 'Sulayman (Salomo)', 'Sulayman (Solomon)'],
      ['زكريا عليه السلام', 'Zakariyya (Sakarias)', 'Zakariyya (Zechariah)'],
      ['يحيى عليه السلام', 'Yahya (Johannes)', 'Yahya (John)'],
    ],
    answerIndex: 1,
  },
  {
    id: 138,
    question: ['من هو النبي الذي أُلقي في الجب ثم صار على خزائن مصر؟', 'Vilken profet kastades i brunnen och blev sedan ansvarig för Egyptens förråd?', 'Which prophet was thrown into the well and later put in charge of Egypt\'s storehouses?'],
    options: [
      ['يوسف عليه السلام', 'Yusuf (Josef)', 'Yusuf (Joseph)'],
      ['يونس عليه السلام', 'Yunus (Jona)', 'Yunus (Jonah)'],
      ['موسى عليه السلام', 'Musa (Mose)', 'Musa (Moses)'],
      ['هارون عليه السلام', 'Harun (Aron)', 'Harun (Aaron)'],
    ],
    answerIndex: 0,
  },
  {
    id: 139,
    question: ['من هو أخو موسى عليه السلام الذي أرسل معه إلى فرعون؟', 'Vem var Moses bror, som sändes med honom till Farao?', 'Who was the brother of Musa, sent with him to Pharaoh?'],
    options: [
      ['شعيب عليه السلام', 'Shuayb', 'Shuayb'],
      ['هارون عليه السلام', 'Harun (Aron)', 'Harun (Aaron)'],
      ['يوشع عليه السلام', 'Yusha (Josua)', 'Yusha (Joshua)'],
      ['إلياس عليه السلام', 'Ilyas (Elia)', 'Ilyas (Elijah)'],
    ],
    answerIndex: 1,
  },

  // ——— Påfyllnad: Profetens biografi (sira) ———
  {
    id: 140,
    question: ['كم كان عمر النبي صلى الله عليه وسلم حين نزل عليه الوحي؟', 'Hur gammal var Profeten Muhammad när uppenbarelsen kom till honom?', 'How old was the Prophet Muhammad when revelation came to him?'],
    options: [
      ['ثلاثون سنة', 'Trettio år', 'Thirty years'],
      ['أربعون سنة', 'Fyrtio år', 'Forty years'],
      ['خمسون سنة', 'Femtio år', 'Fifty years'],
      ['خمس وعشرون سنة', 'Tjugofem år', 'Twenty-five years'],
    ],
    answerIndex: 1,
  },
  {
    id: 141,
    question: ['كم كان عمر النبي صلى الله عليه وسلم عند وفاته؟', 'Hur gammal var Profeten Muhammad när han gick bort?', 'How old was the Prophet Muhammad when he passed away?'],
    options: [
      ['60 سنة', '60 år', '60 years'],
      ['63 سنة', '63 år', '63 years'],
      ['65 سنة', '65 år', '65 years'],
      ['70 سنة', '70 år', '70 years'],
    ],
    answerIndex: 1,
  },
  {
    id: 142,
    question: ['ما اسم الغار الذي نزل فيه الوحي على النبي أول مرة؟', 'Vad heter grottan där uppenbarelsen först kom till Profeten?', 'What is the name of the cave where revelation first came to the Prophet?'],
    options: [
      ['غار ثور', 'Grottan Thawr', 'The cave of Thawr'],
      ['غار حراء', 'Grottan Hira', 'The cave of Hira'],
      ['غار الكهف', 'Grottan i al-Kahf', 'The cave of al-Kahf'],
      ['غار بدر', 'Grottan vid Badr', 'The cave at Badr'],
    ],
    answerIndex: 1,
  },
  {
    id: 143,
    question: ['ما اسم الغار الذي مكث فيه النبي وأبو بكر في طريق الهجرة؟', 'I vilken grotta stannade Profeten och Abu Bakr under hijra?', 'In which cave did the Prophet and Abu Bakr stay during the hijra?'],
    options: [
      ['غار حراء', 'Grottan Hira', 'The cave of Hira'],
      ['غار ثور', 'Grottan Thawr', 'The cave of Thawr'],
      ['غار المرسلات', 'Grottan al-Mursalat', 'The cave of al-Mursalat'],
      ['غار قباء', 'Grottan vid Quba', 'The cave at Quba'],
    ],
    answerIndex: 1,
  },
  {
    id: 144,
    question: ['من هي أول زوجات النبي صلى الله عليه وسلم؟', 'Vem var Profeten Muhammads första hustru?', 'Who was the first wife of the Prophet Muhammad?'],
    options: [
      ['عائشة بنت أبي بكر', 'Aisha bint Abi Bakr', 'Aisha bint Abi Bakr'],
      ['خديجة بنت خويلد', 'Khadija bint Khuwaylid', 'Khadija bint Khuwaylid'],
      ['سودة بنت زمعة', 'Sawda bint Zama', 'Sawda bint Zama'],
      ['حفصة بنت عمر', 'Hafsa bint Umar', 'Hafsa bint Umar'],
    ],
    answerIndex: 1,
  },
  {
    id: 145,
    question: ['ما اسم مرضعة النبي صلى الله عليه وسلم في بني سعد؟', 'Vad hette Profeten Muhammads amma bland Banu Sad?', 'What was the name of the Prophet Muhammad\'s wet nurse among the Banu Sad?'],
    options: [
      ['حليمة السعدية', 'Halima as-Sadiyya', 'Halima al-Sadiyya'],
      ['ثويبة', 'Thuwayba', 'Thuwayba'],
      ['أم أيمن', 'Umm Ayman', 'Umm Ayman'],
      ['أم سليم', 'Umm Sulaym', 'Umm Sulaym'],
    ],
    answerIndex: 0,
  },
  {
    id: 146,
    question: ['ما اسم جد النبي صلى الله عليه وسلم الذي كفله بعد وفاة أمه؟', 'Vad hette Profeten Muhammads farfar, som tog hand om honom efter moderns död?', 'What was the name of the Prophet Muhammad\'s grandfather, who cared for him after his mother\'s death?'],
    options: [
      ['أبو طالب', 'Abu Talib', 'Abu Talib'],
      ['عبد المطلب', 'Abd al-Muttalib', 'Abd al-Muttalib'],
      ['العباس', 'al-Abbas', 'Al-Abbas'],
      ['هاشم', 'Hashim', 'Hashim'],
    ],
    answerIndex: 1,
  },
  {
    id: 147,
    question: ['ما اسم عم النبي صلى الله عليه وسلم الذي كفله بعد جده؟', 'Vad hette Profeten Muhammads farbror, som tog hand om honom efter farfaderns död?', 'What was the name of the Prophet Muhammad\'s uncle, who cared for him after his grandfather?'],
    options: [
      ['أبو طالب', 'Abu Talib', 'Abu Talib'],
      ['العباس بن عبد المطلب', 'al-Abbas ibn Abd al-Muttalib', 'Al-Abbas ibn Abd al-Muttalib'],
      ['حمزة بن عبد المطلب', 'Hamza ibn Abd al-Muttalib', 'Hamza ibn Abd al-Muttalib'],
      ['أبو لهب', 'Abu Lahab', 'Abu Lahab'],
    ],
    answerIndex: 0,
  },
  {
    id: 148,
    question: ['كم سنة دعا النبي صلى الله عليه وسلم في مكة قبل الهجرة؟', 'Hur många år kallade Profeten Muhammad till islam i Mecka före hijra?', 'For how many years did the Prophet Muhammad call to Islam in Mecca before the hijra?'],
    options: [
      ['عشر سنوات', 'Tio år', 'Ten years'],
      ['ثلاث عشرة سنة', 'Tretton år', 'Thirteen years'],
      ['خمس عشرة سنة', 'Femton år', 'Fifteen years'],
      ['عشرون سنة', 'Tjugo år', 'Twenty years'],
    ],
    answerIndex: 1,
  },
  {
    id: 149,
    question: ['ما هي أول غزوة كبرى في الإسلام؟', 'Vilket var det första större slaget i islam?', 'Which was the first major battle in Islam?'],
    options: [
      ['غزوة أحد', 'Slaget vid Uhud', 'The Battle of Uhud'],
      ['غزوة بدر', 'Slaget vid Badr', 'The Battle of Badr'],
      ['غزوة الخندق', 'Slaget vid Khandaq (Diket)', 'The Battle of Khandaq (the Trench)'],
      ['غزوة تبوك', 'Slaget vid Tabuk', 'The Battle of Tabuk'],
    ],
    answerIndex: 1,
  },
  {
    id: 150,
    question: ['كم كان عدد المسلمين في غزوة بدر؟', 'Hur många muslimer deltog i slaget vid Badr?', 'How many Muslims took part in the Battle of Badr?'],
    options: [
      ['313 رجلاً', '313 män', '313 men'],
      ['700 رجل', '700 män', '700 men'],
      ['1000 رجل', '1 000 män', '1,000 men'],
      ['3000 رجل', '3 000 män', '3,000 men'],
    ],
    answerIndex: 0,
  },
  {
    id: 151,
    question: ['في أي غزوة استشهد حمزة بن عبد المطلب رضي الله عنه؟', 'I vilket slag blev Hamza ibn Abd al-Muttalib martyr?', 'In which battle was Hamza ibn Abd al-Muttalib martyred?'],
    options: [
      ['غزوة بدر', 'Slaget vid Badr', 'The Battle of Badr'],
      ['غزوة أحد', 'Slaget vid Uhud', 'The Battle of Uhud'],
      ['غزوة حنين', 'Slaget vid Hunayn', 'The Battle of Hunayn'],
      ['غزوة خيبر', 'Slaget vid Khaybar', 'The Battle of Khaybar'],
    ],
    answerIndex: 1,
  },
  {
    id: 152,
    question: ['ما الغزوة التي تسمى أيضاً بغزوة الأحزاب؟', 'Vilket slag kallas också "de sammansvurnas slag" (al-Ahzab)?', 'Which battle is also called the Battle of the Confederates (al-Ahzab)?'],
    options: [
      ['غزوة الخندق', 'Slaget vid Khandaq (Diket)', 'The Battle of Khandaq (the Trench)'],
      ['غزوة بدر', 'Slaget vid Badr', 'The Battle of Badr'],
      ['غزوة مؤتة', 'Slaget vid Muta', 'The Battle of Muta'],
      ['غزوة تبوك', 'Slaget vid Tabuk', 'The Battle of Tabuk'],
    ],
    answerIndex: 0,
  },
  {
    id: 153,
    question: ['في أي سنة هجرية كان فتح مكة؟', 'Vilket hijriår erövrades Mecka?', 'In which hijri year was Mecca conquered?'],
    options: [
      ['6 هـ', 'År 6 e.H.', '6 AH'],
      ['8 هـ', 'År 8 e.H.', '8 AH'],
      ['9 هـ', 'År 9 e.H.', '9 AH'],
      ['10 هـ', 'År 10 e.H.', '10 AH'],
    ],
    answerIndex: 1,
  },
  {
    id: 154,
    question: ['في أي مدينة توفي النبي صلى الله عليه وسلم ودُفن؟', 'I vilken stad dog Profeten Muhammad och begravdes?', 'In which city did the Prophet Muhammad die and was buried?'],
    options: [
      ['مكة المكرمة', 'Mecka', 'Mecca'],
      ['المدينة المنورة', 'Medina', 'Medina'],
      ['الطائف', 'Taif', 'Taif'],
      ['القدس', 'Jerusalem', 'Jerusalem'],
    ],
    answerIndex: 1,
  },

  // ——— Påfyllnad: Följeslagarna ———
  {
    id: 155,
    question: ['من هو أول الخلفاء الراشدين؟', 'Vem var den förste av de rättrogna kaliferna?', 'Who was the first of the rightly guided caliphs?'],
    options: [
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
    ],
    answerIndex: 1,
  },
  {
    id: 156,
    question: ['من هو الخليفة الملقب بـ (الفاروق)؟', 'Vilken kalif kallades "al-Faruq" (den som skiljer sant från falskt)?', 'Which caliph was called "al-Faruq" (the one who distinguishes truth from falsehood)?'],
    options: [
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['معاوية بن أبي سفيان', 'Muawiya ibn Abi Sufyan', 'Muawiya ibn Abi Sufyan'],
    ],
    answerIndex: 1,
  },
  {
    id: 157,
    question: ['من هو الصحابي الملقب بـ (سيف الله المسلول)؟', 'Vilken följeslagare kallades "Allahs dragna svärd"?', 'Which companion was called "the drawn sword of Allah"?'],
    options: [
      ['خالد بن الوليد', 'Khalid ibn al-Walid', 'Khalid ibn al-Walid'],
      ['عمرو بن العاص', 'Amr ibn al-As', 'Amr ibn al-As'],
      ['سعد بن أبي وقاص', 'Sad ibn Abi Waqqas', 'Sad ibn Abi Waqqas'],
      ['المثنى بن حارثة', 'al-Muthanna ibn Haritha', 'Al-Muthanna ibn Haritha'],
    ],
    answerIndex: 0,
  },
  {
    id: 158,
    question: ['من هو الصحابي الملقب بـ (أمين هذه الأمة)؟', 'Vilken följeslagare kallades "denna gemenskaps pålitlige" (Amin al-Umma)?', 'Which companion was called "the trustworthy one of this community" (Amin al-Umma)?'],
    options: [
      ['أبو عبيدة بن الجراح', 'Abu Ubayda ibn al-Jarrah', 'Abu Ubayda ibn al-Jarrah'],
      ['أبو ذر الغفاري', 'Abu Dharr al-Ghifari', 'Abu Dharr al-Ghifari'],
      ['حذيفة بن اليمان', 'Hudhayfa ibn al-Yaman', 'Hudhayfa ibn al-Yaman'],
      ['أبي بن كعب', 'Ubayy ibn Kab', 'Ubayy ibn Kab'],
    ],
    answerIndex: 0,
  },
  {
    id: 159,
    question: ['من هو مؤذن رسول الله صلى الله عليه وسلم؟', 'Vem var Profeten Muhammads böneutropare (muadhdhin)?', 'Who was the caller to prayer (muadhdhin) of the Prophet Muhammad?'],
    options: [
      ['بلال بن رباح', 'Bilal ibn Rabah', 'Bilal ibn Rabah'],
      ['عمار بن ياسر', 'Ammar ibn Yasir', 'Ammar ibn Yasir'],
      ['زيد بن حارثة', 'Zayd ibn Haritha', 'Zayd ibn Haritha'],
      ['سلمان الفارسي', 'Salman al-Farisi', 'Salman al-Farisi'],
    ],
    answerIndex: 0,
  },
  {
    id: 160,
    question: ['من هو أول من أسلم من الصبيان؟', 'Vem var den förste bland barnen att anta islam?', 'Who was the first among the children to accept Islam?'],
    options: [
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
      ['زيد بن حارثة', 'Zayd ibn Haritha', 'Zayd ibn Haritha'],
      ['عبد الله بن عمر', 'Abdullah ibn Umar', 'Abdullah ibn Umar'],
      ['أسامة بن زيد', 'Usama ibn Zayd', 'Usama ibn Zayd'],
    ],
    answerIndex: 0,
  },
  {
    id: 161,
    question: ['من هو الصحابي الذي جمع القرآن في مصحف بأمر أبي بكر الصديق؟', 'Vilken följeslagare sammanställde Koranen i ett band på Abu Bakrs befallning?', 'Which companion compiled the Quran into one volume by the order of Abu Bakr?'],
    options: [
      ['زيد بن ثابت', 'Zayd ibn Thabit', 'Zayd ibn Thabit'],
      ['عبد الله بن مسعود', 'Abdullah ibn Masud', 'Abdullah ibn Masud'],
      ['أبي بن كعب', 'Ubayy ibn Kab', 'Ubayy ibn Kab'],
      ['معاذ بن جبل', 'Muadh ibn Jabal', 'Muadh ibn Jabal'],
    ],
    answerIndex: 0,
  },
  {
    id: 162,
    question: ['في عهد أي خليفة نُسخت المصاحف ووُحّدت وأُرسلت إلى الأمصار؟', 'Under vilken kalifs tid kopierades och enades koranexemplaren och sändes till provinserna?', 'In the time of which caliph were the copies of the Quran unified and sent to the provinces?'],
    options: [
      ['أبو بكر الصديق', 'Abu Bakr as-Siddiq', 'Abu Bakr al-Siddiq'],
      ['عمر بن الخطاب', 'Umar ibn al-Khattab', 'Umar ibn al-Khattab'],
      ['عثمان بن عفان', 'Uthman ibn Affan', 'Uthman ibn Affan'],
      ['علي بن أبي طالب', 'Ali ibn Abi Talib', 'Ali ibn Abi Talib'],
    ],
    answerIndex: 2,
  },
  {
    id: 163,
    question: ['من هي أم المؤمنين التي روت أكثر الأحاديث عن النبي صلى الله عليه وسلم؟', 'Vilken av Profetens hustrur återberättade flest hadither från honom?', 'Which of the Prophet\'s wives narrated the most hadith from him?'],
    options: [
      ['عائشة بنت أبي بكر', 'Aisha bint Abi Bakr', 'Aisha bint Abi Bakr'],
      ['أم سلمة', 'Umm Salama', 'Umm Salama'],
      ['حفصة بنت عمر', 'Hafsa bint Umar', 'Hafsa bint Umar'],
      ['زينب بنت جحش', 'Zaynab bint Jahsh', 'Zaynab bint Jahsh'],
    ],
    answerIndex: 0,
  },
  {
    id: 164,
    question: ['من هي أصغر بنات النبي صلى الله عليه وسلم وزوجة علي بن أبي طالب؟', 'Vem var Profeten Muhammads yngsta dotter och Ali ibn Abi Talibs hustru?', 'Who was the youngest daughter of the Prophet Muhammad and the wife of Ali ibn Abi Talib?'],
    options: [
      ['زينب', 'Zaynab', 'Zaynab'],
      ['رقية', 'Ruqayya', 'Ruqayya'],
      ['أم كلثوم', 'Umm Kulthum', 'Umm Kulthum'],
      ['فاطمة الزهراء', 'Fatima az-Zahra', 'Fatima al-Zahra'],
    ],
    answerIndex: 3,
  },
  {
    id: 165,
    question: ['من هو الصحابي الملقب بـ (ترجمان القرآن)؟', 'Vilken följeslagare kallades "Koranens uttolkare"?', 'Which companion was called "the interpreter of the Quran"?'],
    options: [
      ['عبد الله بن عباس', 'Abdullah ibn Abbas', 'Abdullah ibn Abbas'],
      ['عبد الله بن عمر', 'Abdullah ibn Umar', 'Abdullah ibn Umar'],
      ['أبو هريرة', 'Abu Hurayra', 'Abu Hurayra'],
      ['أنس بن مالك', 'Anas ibn Malik', 'Anas ibn Malik'],
    ],
    answerIndex: 0,
  },
];
