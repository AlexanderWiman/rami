/**
 * Morning, evening, bedtime and post-prayer adhkar (Islamic remembrances).
 * Arabic text with transliteration and translation.
 * From the Sunnah — أذكار الصباح والمساء والنوم وبعد الصلاة
 * 20–25 texts per category.
 */
export type AdhkarCategory = 'morning' | 'evening' | 'bedtime' | 'postPrayer';

export type AdhkarItem = {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  count?: number;
};

export type AdhkarSection = {
  id: string;
  category: AdhkarCategory;
  items: AdhkarItem[];
};

export const ADHKAR_SECTIONS: AdhkarSection[] = [
  {
    id: 'morning',
    category: 'morning',
    items: [
      {
        id: 'morning-1',
        arabic: 'أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
        transliteration: "A'udhu billahi minash-shaytanir-rajim",
        meaning: "I seek refuge in Allah from the accursed Satan",
      },
      {
        id: 'morning-2',
        arabic: 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ',
        transliteration: 'Bismillahir-Rahmanir-Rahim',
        meaning: 'In the name of Allah, the Most Gracious, the Most Merciful',
      },
      {
        id: 'morning-3',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        transliteration: 'Qul Huwallahu Ahad, Qul A\'udhu bi Rabbil-Falaq, Qul A\'udhu bi Rabbin-Nas',
        meaning: 'Surah Al-Ikhlas, Al-Falaq, An-Nas',
        count: 3,
      },
      {
        id: 'morning-4',
        arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
        transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum",
        meaning: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer (Ayatul Kursi)',
      },
      {
        id: 'morning-5',
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
        transliteration: "Asbahna wa asbahal-mulku lillahi wal-hamdu lillah",
        meaning: 'We have reached the morning and the dominion belongs to Allah, and all praise is for Allah',
      },
      {
        id: 'morning-6',
        arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        transliteration: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur",
        meaning: 'O Allah, by You we have reached the morning and by You the evening, by You we live and die, and to You is the resurrection',
      },
      {
        id: 'morning-7',
        arabic: 'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration: "Bismillahi alladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim",
        meaning: 'In the name of Allah, with Whose name nothing can harm on earth or in heaven, and He is the All-Hearing, the All-Knowing',
        count: 3,
      },
      {
        id: 'morning-8',
        arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir",
        meaning: 'None has the right to be worshipped but Allah alone, He has no partner. His is the dominion and His is the praise, and He is Able to do all things',
        count: 10,
      },
      {
        id: 'morning-9',
        arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
        transliteration: "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'arshil-'azim",
        meaning: 'Allah is sufficient for me. None has the right to be worshipped but He. In Him I put my trust and He is the Lord of the Mighty Throne',
        count: 7,
      },
      {
        id: 'morning-10',
        arabic: 'رَضِيتُ بِاللهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا',
        transliteration: "Raditu billahi Rabban wa bil-Islami dinan wa bi-Muhammadin nabiyya",
        meaning: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Prophet',
        count: 3,
      },
      {
        id: 'morning-11',
        arabic: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
        transliteration: "Allahumma ma asbaha bi min ni'matin aw bi-ahadin min khalqika faminka wahdaka la sharika lak, falakal-hamdu wa lakash-shukr",
        meaning: 'O Allah, whatever blessing has come to me or to any of Your creation this morning is from You alone, without partner, so to You is all praise and thanks',
      },
      {
        id: 'morning-12',
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
        transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari",
        meaning: 'O Allah, grant health to my body, my hearing, and my sight',
        count: 3,
      },
      {
        id: 'morning-13',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: "A'udhu bikalimati-llahit-tammati min sharri ma khalaq",
        meaning: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created',
        count: 3,
      },
      {
        id: 'morning-14',
        arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
        transliteration: "Ya Hayyu ya Qayyumu birahmatika astaghith, aslih li sha'ni kullahu wa la takilni ila nafsi tarfata 'ayn",
        meaning: 'O Ever-Living One, O Eternal One, by Your mercy I call on You to set right all my affairs. Do not place me in charge of my soul even for a moment',
      },
      {
        id: 'morning-15',
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
        transliteration: "Allahumma inni as'aluka 'ilman nafi'an wa rizqan tayyiban wa 'amalan mutaqabbalan",
        meaning: 'O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds',
      },
      {
        id: 'morning-16',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ',
        transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan wal-'ajzi wal-kasal",
        meaning: 'O Allah, I seek refuge in You from anxiety, sorrow, weakness, and laziness',
      },
      {
        id: 'morning-17',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ',
        transliteration: "Subhanallahi wa bihamdihi, 'adada khalqihi wa rida nafsihi wa zinata 'arshihi wa midada kalimatih",
        meaning: 'Glory and praise be to Allah, by the multitude of His creation, His pleasure, the weight of His Throne, and the extent of His Words',
      },
      {
        id: 'morning-18',
        arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullah wa atubu ilayh',
        meaning: 'I seek the forgiveness of Allah and repent to Him',
        count: 100,
      },
      {
        id: 'morning-19',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhanallahi wa bihamdihi',
        meaning: 'Glory and praise be to Allah',
        count: 100,
      },
      {
        id: 'morning-20',
        arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir",
        meaning: 'None has the right to be worshipped but Allah alone, He has no partner. His is the dominion and His is the praise, and He is Able to do all things',
        count: 100,
      },
      {
        id: 'morning-21',
        arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim, innaka Hamidun Majid",
        meaning: 'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Verily, You are Praiseworthy, Glorious',
      },
    ],
  },
  {
    id: 'evening',
    category: 'evening',
    items: [
      {
        id: 'evening-1',
        arabic: 'أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
        transliteration: "A'udhu billahi minash-shaytanir-rajim",
        meaning: "I seek refuge in Allah from the accursed Satan",
      },
      {
        id: 'evening-2',
        arabic: 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ',
        transliteration: 'Bismillahir-Rahmanir-Rahim',
        meaning: 'In the name of Allah, the Most Gracious, the Most Merciful',
      },
      {
        id: 'evening-3',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        transliteration: 'Qul Huwallahu Ahad, Qul A\'udhu bi Rabbil-Falaq, Qul A\'udhu bi Rabbin-Nas',
        meaning: 'Surah Al-Ikhlas, Al-Falaq, An-Nas',
        count: 3,
      },
      {
        id: 'evening-4',
        arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
        transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum",
        meaning: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer (Ayatul Kursi)',
      },
      {
        id: 'evening-5',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
        transliteration: "Amsayna wa amsal-mulku lillahi wal-hamdu lillah",
        meaning: 'We have reached the evening and the dominion belongs to Allah, and all praise is for Allah',
      },
      {
        id: 'evening-6',
        arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
        transliteration: "Allahumma bika amsayna wa bika asbahna wa bika nahya wa bika namutu wa ilaykal-masir",
        meaning: 'O Allah, by You we have reached the evening and by You the morning, by You we live and die, and to You is the return',
      },
      {
        id: 'evening-7',
        arabic: 'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration: "Bismillahi alladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim",
        meaning: 'In the name of Allah, with Whose name nothing can harm on earth or in heaven, and He is the All-Hearing, the All-Knowing',
        count: 3,
      },
      {
        id: 'evening-8',
        arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
        transliteration: "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'arshil-'azim",
        meaning: 'Allah is sufficient for me. None has the right to be worshipped but He. In Him I put my trust and He is the Lord of the Mighty Throne',
        count: 7,
      },
      {
        id: 'evening-9',
        arabic: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ',
        transliteration: "Allahumma inni amsaytu ush-hiduka wa ush-hidu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka Antallahu la ilaha illa Anta wahdaka la sharika lak",
        meaning: 'O Allah, I have reached the evening and call upon You and the bearers of Your Throne, Your angels, and all Your creation to witness that You are Allah, none has the right to be worshipped but You alone, with no partner',
      },
      {
        id: 'evening-10',
        arabic: 'رَضِيتُ بِاللهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا',
        transliteration: "Raditu billahi Rabban wa bil-Islami dinan wa bi-Muhammadin nabiyya",
        meaning: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Prophet',
        count: 3,
      },
      {
        id: 'evening-11',
        arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
        transliteration: "Allahumma ma amsa bi min ni'matin aw bi-ahadin min khalqika faminka wahdaka la sharika lak, falakal-hamdu wa lakash-shukr",
        meaning: 'O Allah, whatever blessing has come to me or to any of Your creation this evening is from You alone, without partner, so to You is all praise and thanks',
      },
      {
        id: 'evening-12',
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
        transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari",
        meaning: 'O Allah, grant health to my body, my hearing, and my sight',
        count: 3,
      },
      {
        id: 'evening-13',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: "A'udhu bikalimati-llahit-tammati min sharri ma khalaq",
        meaning: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created',
        count: 3,
      },
      {
        id: 'evening-14',
        arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
        transliteration: "Ya Hayyu ya Qayyumu birahmatika astaghith, aslih li sha'ni kullahu wa la takilni ila nafsi tarfata 'ayn",
        meaning: 'O Ever-Living One, O Eternal One, by Your mercy I call on You to set right all my affairs. Do not place me in charge of my soul even for a moment',
      },
      {
        id: 'evening-15',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ',
        transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan wal-'ajzi wal-kasal",
        meaning: 'O Allah, I seek refuge in You from anxiety, sorrow, weakness, and laziness',
      },
      {
        id: 'evening-16',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ',
        transliteration: "Subhanallahi wa bihamdihi, 'adada khalqihi wa rida nafsihi wa zinata 'arshihi wa midada kalimatih",
        meaning: 'Glory and praise be to Allah, by the multitude of His creation, His pleasure, the weight of His Throne, and the extent of His Words',
      },
      {
        id: 'evening-17',
        arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullah wa atubu ilayh',
        meaning: 'I seek the forgiveness of Allah and repent to Him',
        count: 100,
      },
      {
        id: 'evening-18',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhanallahi wa bihamdihi',
        meaning: 'Glory and praise be to Allah',
        count: 100,
      },
      {
        id: 'evening-19',
        arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir",
        meaning: 'None has the right to be worshipped but Allah alone, He has no partner. His is the dominion and His is the praise, and He is Able to do all things',
        count: 100,
      },
      {
        id: 'evening-20',
        arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim, innaka Hamidun Majid",
        meaning: 'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Verily, You are Praiseworthy, Glorious',
      },
    ],
  },
  {
    id: 'bedtime',
    category: 'bedtime',
    items: [
      {
        id: 'bedtime-1',
        arabic: 'أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
        transliteration: "A'udhu billahi minash-shaytanir-rajim",
        meaning: "I seek refuge in Allah from the accursed Satan",
      },
      {
        id: 'bedtime-2',
        arabic: 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ',
        transliteration: 'Bismillahir-Rahmanir-Rahim',
        meaning: 'In the name of Allah, the Most Gracious, the Most Merciful',
      },
      {
        id: 'bedtime-3',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        transliteration: 'Qul Huwallahu Ahad, Qul A\'udhu bi Rabbil-Falaq, Qul A\'udhu bi Rabbin-Nas',
        meaning: 'Surah Al-Ikhlas, Al-Falaq, An-Nas',
        count: 3,
      },
      {
        id: 'bedtime-4',
        arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
        transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum",
        meaning: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer (Ayatul Kursi)',
      },
      {
        id: 'bedtime-5',
        arabic: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ',
        transliteration: "Amanar-Rasulu bima unzila ilayhi min Rabbihi wal-mu'minun",
        meaning: 'The Messenger believes in what was revealed to him from his Lord, and the believers (last 2 verses of Al-Baqarah)',
      },
      {
        id: 'bedtime-6',
        arabic: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ وَوَجَّهْتُ وَجْهِي إِلَيْكَ وَفَوَّضْتُ أَمْرِي إِلَيْكَ',
        transliteration: "Allahumma aslamtu nafsi ilayka wa wajjahtu wajhi ilayka wa fawwadtu amri ilayka",
        meaning: 'O Allah, I have submitted myself to You, turned my face to You, and entrusted my affairs to You',
      },
      {
        id: 'bedtime-7',
        arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
        transliteration: "Bismika Allahumma amutu wa ahya",
        meaning: 'In Your name, O Allah, I die and I live',
      },
      {
        id: 'bedtime-8',
        arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
        transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
        meaning: 'O Allah, protect me from Your punishment on the day You resurrect Your servants',
      },
      {
        id: 'bedtime-9',
        arabic: 'بِاسْمِكَ اللَّهُمَّ وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ',
        transliteration: "Bismika Allahumma wada'tu janbi wa bika arfa'uh",
        meaning: 'In Your name, O Allah, I lay my side down, and by You I raise it',
      },
      {
        id: 'bedtime-10',
        arabic: 'اللَّهُمَّ إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
        transliteration: "Allahumma in amsakta nafsi farhamha, wa in arsaltaha fahfazha bima tahfazu bihi 'ibadakas-salihin",
        meaning: 'O Allah, if You take my soul, have mercy on it, and if You release it, protect it with what You protect Your righteous servants',
      },
      {
        id: 'bedtime-11',
        arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ',
        transliteration: "Allahumma Anta Rabbi la ilaha illa Anta khalaqtani wa ana 'abduk",
        meaning: 'O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant',
      },
      {
        id: 'bedtime-12',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَمِنْ عَذَابِ الْقَبْرِ',
        transliteration: "Allahumma inni a'udhu bika minal-kufri wal-faqri wa min 'adhabil-qabr",
        meaning: 'O Allah, I seek refuge in You from disbelief, poverty, and the punishment of the grave',
        count: 3,
      },
      {
        id: 'bedtime-13',
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
        transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari",
        meaning: 'O Allah, grant health to my body, my hearing, and my sight',
        count: 3,
      },
      {
        id: 'bedtime-14',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: "A'udhu bikalimati-llahit-tammati min sharri ma khalaq",
        meaning: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created',
        count: 3,
      },
      {
        id: 'bedtime-15',
        arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
        transliteration: "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'arshil-'azim",
        meaning: 'Allah is sufficient for me. None has the right to be worshipped but He. In Him I put my trust and He is the Lord of the Mighty Throne',
        count: 7,
      },
      {
        id: 'bedtime-16',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhanallahi wa bihamdihi',
        meaning: 'Glory and praise be to Allah',
        count: 100,
      },
      {
        id: 'bedtime-17',
        arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullah wa atubu ilayh',
        meaning: 'I seek the forgiveness of Allah and repent to Him',
        count: 100,
      },
      {
        id: 'bedtime-18',
        arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim, innaka Hamidun Majid",
        meaning: 'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Verily, You are Praiseworthy, Glorious',
      },
    ],
  },
  {
    id: 'postPrayer',
    category: 'postPrayer',
    items: [
      {
        id: 'postPrayer-1',
        arabic: 'أَسْتَغْفِرُ اللَّهَ',
        transliteration: 'Astaghfirullah',
        meaning: 'I seek forgiveness from Allah',
        count: 3,
      },
      {
        id: 'postPrayer-2',
        arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        transliteration: "Allahumma Antas-Salamu wa minkas-salamu tabarakta ya Dhal-Jalali wal-Ikram",
        meaning: 'O Allah, You are As-Salam (the Source of Peace), and from You is peace. Blessed are You, O Possessor of majesty and honour',
      },
      {
        id: 'postPrayer-3',
        arabic: 'سُبْحَانَ اللَّهِ',
        transliteration: 'Subhanallah',
        meaning: 'Glory be to Allah',
        count: 33,
      },
      {
        id: 'postPrayer-4',
        arabic: 'الْحَمْدُ لِلَّهِ',
        transliteration: 'Alhamdulillah',
        meaning: 'Praise be to Allah',
        count: 33,
      },
      {
        id: 'postPrayer-5',
        arabic: 'اللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        meaning: 'Allah is the Greatest',
        count: 33,
      },
      {
        id: 'postPrayer-6',
        arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir",
        meaning: 'None has the right to be worshipped but Allah alone, He has no partner. His is the dominion and His is the praise, and He is Able to do all things',
      },
      {
        id: 'postPrayer-7',
        arabic: 'اللَّهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik",
        meaning: 'O Allah, help me to remember You, thank You, and worship You in the best manner',
      },
      {
        id: 'postPrayer-8',
        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
        transliteration: "La hawla wa la quwwata illa billah",
        meaning: 'There is no power and no strength except with Allah',
      },
      {
        id: 'postPrayer-9',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ',
        transliteration: "Allahumma inni a'udhu bika minal-kufri wal-faqri",
        meaning: 'O Allah, I seek refuge in You from disbelief and poverty',
      },
      {
        id: 'postPrayer-10',
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
        meaning: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire',
      },
      {
        id: 'postPrayer-11',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        transliteration: 'Subhanallahi wa bihamdihi',
        meaning: 'Glory and praise be to Allah',
        count: 33,
      },
      {
        id: 'postPrayer-12',
        arabic: 'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ',
        transliteration: "Allahumma la mani'a lima a'tayta wa la mu'tiya lima mana't",
        meaning: 'O Allah, there is none who can withhold what You give, and none who can give what You withhold',
      },
      {
        id: 'postPrayer-13',
        arabic: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي',
        transliteration: "Allahumma ghfir li warhamni wahdini wa 'afini warzuqni",
        meaning: 'O Allah, forgive me, have mercy on me, guide me, grant me health, and provide for me',
      },
      {
        id: 'postPrayer-14',
        arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullah wa atubu ilayh',
        meaning: 'I seek the forgiveness of Allah and repent to Him',
      },
      {
        id: 'postPrayer-15',
        arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim, innaka Hamidun Majid",
        meaning: 'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Verily, You are Praiseworthy, Glorious',
      },
    ],
  },
];
