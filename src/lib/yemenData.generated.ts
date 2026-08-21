export interface YemenDistrict { id: string; nameAr: string; nameEn: string; }
export interface YemenGovernorate { id: string; nameAr: string; nameEn: string; districts: YemenDistrict[]; }
export const yemenGovernorates: YemenGovernorate[] = [
  {
    "id": "أمانة العاصمة",
    "nameAr": "أمانة العاصمة",
    "nameEn": "Amant Al-Asmah",
    "districts": [
      {
        "id": "أمانة العاصمة_صنعاء القديمة",
        "nameAr": "صنعاء القديمة",
        "nameEn": "Sana'a Al-qdimah"
      },
      {
        "id": "أمانة العاصمة_آزَاْل",
        "nameAr": "آزَاْل",
        "nameEn": "Azal"
      },
      {
        "id": "أمانة العاصمة_الصافية",
        "nameAr": "الصافية",
        "nameEn": "Al-Safiah"
      },
      {
        "id": "أمانة العاصمة_السبعين",
        "nameAr": "السبعين",
        "nameEn": "Al-Sabe'en"
      },
      {
        "id": "أمانة العاصمة_شعوب",
        "nameAr": "شعوب",
        "nameEn": "Sh'oob"
      },
      {
        "id": "أمانة العاصمة_الوحدة",
        "nameAr": "الوحدة",
        "nameEn": "Al-Wehdah"
      },
      {
        "id": "أمانة العاصمة_التحرير",
        "nameAr": "التحرير",
        "nameEn": "Al-Tahrir"
      },
      {
        "id": "أمانة العاصمة_الثورة",
        "nameAr": "الثورة",
        "nameEn": "Al-Thowarah"
      },
      {
        "id": "أمانة العاصمة_معين",
        "nameAr": "معين",
        "nameEn": "Maeen"
      },
      {
        "id": "أمانة العاصمة_بني الحارث",
        "nameAr": "بني الحارث",
        "nameEn": "Bni Al-Harith"
      },
      {
        "id": "أمانة العاصمة_ضواحي الأمانة سنحان وبني بهلول",
        "nameAr": "ضواحي الأمانة سنحان وبني بهلول",
        "nameEn": "Dwahy Al-Amant Snhan Wbny Bhlwl"
      },
      {
        "id": "أمانة العاصمة_ضواحي الأمانة همدان",
        "nameAr": "ضواحي الأمانة همدان",
        "nameEn": "Dwahy Al-Amant Hmdan"
      }
    ]
  },
  {
    "id": "صنعاء",
    "nameAr": "صنعاء",
    "nameEn": "Sanaa",
    "districts": [
      {
        "id": "صنعاء_همدان",
        "nameAr": "همدان",
        "nameEn": "Hamdan"
      },
      {
        "id": "صنعاء_أرحب",
        "nameAr": "أرحب",
        "nameEn": "Arhab"
      },
      {
        "id": "صنعاء_جحانة",
        "nameAr": "جحانة",
        "nameEn": "Jihanah"
      },
      {
        "id": "صنعاء_بلاد الروس",
        "nameAr": "بلاد الروس",
        "nameEn": "Bilad AL-Roos"
      },
      {
        "id": "صنعاء_سنحان",
        "nameAr": "سنحان",
        "nameEn": "Sanhan"
      },
      {
        "id": "صنعاء_الحصن",
        "nameAr": "الحصن",
        "nameEn": "Al-Hisn"
      },
      {
        "id": "صنعاء_صعفان",
        "nameAr": "صعفان",
        "nameEn": "Sa'fan"
      },
      {
        "id": "صنعاء_بني حشيش",
        "nameAr": "بني حشيش",
        "nameEn": "Bni Hishaish"
      },
      {
        "id": "صنعاء_الطيال",
        "nameAr": "الطيال",
        "nameEn": "Al-Tial"
      },
      {
        "id": "صنعاء_خولان",
        "nameAr": "خولان",
        "nameEn": "Khawlan"
      },
      {
        "id": "صنعاء_بني ضبيان",
        "nameAr": "بني ضبيان",
        "nameEn": "Bni Dhabian"
      },
      {
        "id": "صنعاء_الحيمة الخارجية",
        "nameAr": "الحيمة الخارجية",
        "nameEn": "AL-Haimah Al-Kharijiah"
      },
      {
        "id": "صنعاء_الحيمة الداخلية",
        "nameAr": "الحيمة الداخلية",
        "nameEn": "Al-Haimah Al-Dakhiliah"
      },
      {
        "id": "صنعاء_مناخة",
        "nameAr": "مناخة",
        "nameEn": "Manakhah"
      },
      {
        "id": "صنعاء_نهم",
        "nameAr": "نهم",
        "nameEn": "Nihm"
      },
      {
        "id": "صنعاء_بني مطر",
        "nameAr": "بني مطر",
        "nameEn": "Bni Matar"
      }
    ]
  },
  {
    "id": "عدن",
    "nameAr": "عدن",
    "nameEn": "Aden",
    "districts": [
      {
        "id": "عدن_دار سعد",
        "nameAr": "دار سعد",
        "nameEn": "Dar Saad"
      },
      {
        "id": "عدن_الشيخ عثمان",
        "nameAr": "الشيخ عثمان",
        "nameEn": "Al-Shaikh Othman"
      },
      {
        "id": "عدن_المنصورة",
        "nameAr": "المنصورة",
        "nameEn": "Al-Mansorah"
      },
      {
        "id": "عدن_البريقة",
        "nameAr": "البريقة",
        "nameEn": "Al-Boriqah"
      },
      {
        "id": "عدن_التواهي",
        "nameAr": "التواهي",
        "nameEn": "Al-Tawwahi"
      },
      {
        "id": "عدن_خور مكسر",
        "nameAr": "خور مكسر",
        "nameEn": "Khoor Maksar"
      },
      {
        "id": "عدن_صيرة",
        "nameAr": "صيرة",
        "nameEn": "Seerh"
      },
      {
        "id": "عدن_المعلا",
        "nameAr": "المعلا",
        "nameEn": "Al-Mo'alla"
      }
    ]
  },
  {
    "id": "الحديدة",
    "nameAr": "الحديدة",
    "nameEn": "Al-Hodeidah",
    "districts": [
      {
        "id": "الحديدة_بيت الفقية",
        "nameAr": "بيت الفقية",
        "nameEn": "Bait Al-Fakih"
      },
      {
        "id": "الحديدة_التحيتا",
        "nameAr": "التحيتا",
        "nameEn": "Al-Tohaita"
      },
      {
        "id": "الحديدة_كمران",
        "nameAr": "كمران",
        "nameEn": "Kamaran"
      },
      {
        "id": "الحديدة_الخوخة",
        "nameAr": "الخوخة",
        "nameEn": "Al-Khookhah"
      },
      {
        "id": "الحديدة_الدريهمي",
        "nameAr": "الدريهمي",
        "nameEn": "Al-Doraihmi"
      },
      {
        "id": "الحديدة_اللحية",
        "nameAr": "اللحية",
        "nameEn": "Al-Luhayyah"
      },
      {
        "id": "الحديدة_زبيد",
        "nameAr": "زبيد",
        "nameEn": "Zabeed"
      },
      {
        "id": "الحديدة_جبل راس",
        "nameAr": "جبل راس",
        "nameEn": "Jabal Raas"
      },
      {
        "id": "الحديدة_المراوعة",
        "nameAr": "المراوعة",
        "nameEn": "Al-Marawiah"
      },
      {
        "id": "الحديدة_الجراحي",
        "nameAr": "الجراحي",
        "nameEn": "Al-Jarrahi"
      },
      {
        "id": "الحديدة_الزهرة",
        "nameAr": "الزهرة",
        "nameEn": "Al-Zuhrah"
      },
      {
        "id": "الحديدة_المغلاف",
        "nameAr": "المغلاف",
        "nameEn": "Al-Mighlaf"
      },
      {
        "id": "الحديدة_المنصورية",
        "nameAr": "المنصورية",
        "nameEn": "Al-Mansoriah"
      },
      {
        "id": "الحديدة_الزيدية",
        "nameAr": "الزيدية",
        "nameEn": "Al-Zaydiyah"
      },
      {
        "id": "الحديدة_الحالي",
        "nameAr": "الحالي",
        "nameEn": "Al-Hali"
      },
      {
        "id": "الحديدة_الحجيلة",
        "nameAr": "الحجيلة",
        "nameEn": "Al-Hojailah"
      },
      {
        "id": "الحديدة_السخنة",
        "nameAr": "السخنة",
        "nameEn": "Al-Sokhnah"
      },
      {
        "id": "الحديدة_المنيرة",
        "nameAr": "المنيرة",
        "nameEn": "Al-Munirah"
      },
      {
        "id": "الحديدة_الحوك",
        "nameAr": "الحوك",
        "nameEn": "Al-Hook"
      },
      {
        "id": "الحديدة_الصليف",
        "nameAr": "الصليف",
        "nameEn": "Al-Saleef"
      },
      {
        "id": "الحديدة_الميناء",
        "nameAr": "الميناء",
        "nameEn": "Al-Mena"
      },
      {
        "id": "الحديدة_باجل",
        "nameAr": "باجل",
        "nameEn": "Bajil"
      },
      {
        "id": "الحديدة_الضحي",
        "nameAr": "الضحي",
        "nameEn": "Al-Dhahi"
      },
      {
        "id": "الحديدة_حيس",
        "nameAr": "حيس",
        "nameEn": "Hais"
      },
      {
        "id": "الحديدة_القناوص",
        "nameAr": "القناوص",
        "nameEn": "Al-Qnawis"
      },
      {
        "id": "الحديدة_برع",
        "nameAr": "برع",
        "nameEn": "Bora"
      }
    ]
  },
  {
    "id": "ذمار",
    "nameAr": "ذمار",
    "nameEn": "Thamar",
    "districts": [
      {
        "id": "ذمار_جهران",
        "nameAr": "جهران",
        "nameEn": "Jhran"
      },
      {
        "id": "ذمار_عتمة",
        "nameAr": "عتمة",
        "nameEn": "Otmah"
      },
      {
        "id": "ذمار_ميفعة عنس",
        "nameAr": "ميفعة عنس",
        "nameEn": "Mayfa'at Ans"
      },
      {
        "id": "ذمار_الحداء",
        "nameAr": "الحداء",
        "nameEn": "Al-Hada"
      },
      {
        "id": "ذمار_عنس",
        "nameAr": "عنس",
        "nameEn": "Ans"
      },
      {
        "id": "ذمار_وصاب السافل",
        "nameAr": "وصاب السافل",
        "nameEn": "Wosab Al-Safil"
      },
      {
        "id": "ذمار_وصاب العالي",
        "nameAr": "وصاب العالي",
        "nameEn": "Wosab Al-Aali"
      },
      {
        "id": "ذمار_جبل الشرق",
        "nameAr": "جبل الشرق",
        "nameEn": "Jabal Al-Sharq"
      },
      {
        "id": "ذمار_المنار",
        "nameAr": "المنار",
        "nameEn": "Al-Manar"
      },
      {
        "id": "ذمار_مغرب عنس",
        "nameAr": "مغرب عنس",
        "nameEn": "Maghrib Ans"
      },
      {
        "id": "ذمار_ضوران آنس",
        "nameAr": "ضوران آنس",
        "nameEn": "Dhoran Aanis"
      },
      {
        "id": "ذمار_مدينة ذمار",
        "nameAr": "مدينة ذمار",
        "nameEn": "Thamar City"
      }
    ]
  },
  {
    "id": "عمران",
    "nameAr": "عمران",
    "nameEn": "Amran",
    "districts": [
      {
        "id": "عمران_حرف سفيان",
        "nameAr": "حرف سفيان",
        "nameEn": "Harf Sofian"
      },
      {
        "id": "عمران_حوث",
        "nameAr": "حوث",
        "nameEn": "Hooth"
      },
      {
        "id": "عمران_العشة",
        "nameAr": "العشة",
        "nameEn": "Al-Ashah"
      },
      {
        "id": "عمران_قفلة عذر",
        "nameAr": "قفلة عذر",
        "nameEn": "Qiflt Ethar"
      },
      {
        "id": "عمران_شهارة",
        "nameAr": "شهارة",
        "nameEn": "Shaharah"
      },
      {
        "id": "عمران_المدان",
        "nameAr": "المدان",
        "nameEn": "Al-Madan"
      },
      {
        "id": "عمران_صوير",
        "nameAr": "صوير",
        "nameEn": "Sowair"
      },
      {
        "id": "عمران_ظليمة حبور",
        "nameAr": "ظليمة حبور",
        "nameEn": "Dholaimah Haboor"
      },
      {
        "id": "عمران_السودة",
        "nameAr": "السودة",
        "nameEn": "Al-Sawdah"
      },
      {
        "id": "عمران_خمر",
        "nameAr": "خمر",
        "nameEn": "Khamer"
      },
      {
        "id": "عمران_ذيبين",
        "nameAr": "ذيبين",
        "nameEn": "Thibain"
      },
      {
        "id": "عمران_خارف",
        "nameAr": "خارف",
        "nameEn": "Kharif"
      },
      {
        "id": "عمران_ريدة",
        "nameAr": "ريدة",
        "nameEn": "Raidah"
      },
      {
        "id": "عمران_جبل عيال يزيد",
        "nameAr": "جبل عيال يزيد",
        "nameEn": "Eyal Yazeed Mountain"
      },
      {
        "id": "عمران_السود",
        "nameAr": "السود",
        "nameEn": "Al-Sawd"
      },
      {
        "id": "عمران_عمران",
        "nameAr": "عمران",
        "nameEn": "Amran"
      },
      {
        "id": "عمران_مسور",
        "nameAr": "مسور",
        "nameEn": "Maswar"
      },
      {
        "id": "عمران_ثلا",
        "nameAr": "ثلا",
        "nameEn": "Thula"
      },
      {
        "id": "عمران_عيال سريح",
        "nameAr": "عيال سريح",
        "nameEn": "Eial Sraih"
      },
      {
        "id": "عمران_بني صريم",
        "nameAr": "بني صريم",
        "nameEn": "Bni Soraim"
      }
    ]
  },
  {
    "id": "حجة",
    "nameAr": "حجة",
    "nameEn": "Hajjah",
    "districts": [
      {
        "id": "حجة_بكيل المير",
        "nameAr": "بكيل المير",
        "nameEn": "Bakel Al-Meer"
      },
      {
        "id": "حجة_بني العوام",
        "nameAr": "بني العوام",
        "nameEn": "Bni Al-Awam"
      },
      {
        "id": "حجة_أفلح الشام",
        "nameAr": "أفلح الشام",
        "nameEn": "Aflah Al-Sham"
      },
      {
        "id": "حجة_أفلح اليمن",
        "nameAr": "أفلح اليمن",
        "nameEn": "Aflah Al-Yemen"
      },
      {
        "id": "حجة_بني قيس الطور",
        "nameAr": "بني قيس الطور",
        "nameEn": "Bni Qais Al-Tawr"
      },
      {
        "id": "حجة_كحلان الشرف",
        "nameAr": "كحلان الشرف",
        "nameEn": "Kohlan Al-Sharaf"
      },
      {
        "id": "حجة_كحلان عفار",
        "nameAr": "كحلان عفار",
        "nameEn": "Qohlan Affar"
      },
      {
        "id": "حجة_خيران المحرق",
        "nameAr": "خيران المحرق",
        "nameEn": "Khiran Al-Mahrraq"
      },
      {
        "id": "حجة_حجة",
        "nameAr": "حجة",
        "nameEn": "Hajjah"
      },
      {
        "id": "حجة_مدينة حجة",
        "nameAr": "مدينة حجة",
        "nameEn": "Hajjah City"
      },
      {
        "id": "حجة_قفل شمر",
        "nameAr": "قفل شمر",
        "nameEn": "Qufl Shamar"
      },
      {
        "id": "حجة_قارة",
        "nameAr": "قارة",
        "nameEn": "Qarah"
      },
      {
        "id": "حجة_أسلم",
        "nameAr": "أسلم",
        "nameEn": "Aslm"
      },
      {
        "id": "حجة_الجميمة",
        "nameAr": "الجميمة",
        "nameEn": "Al-Jamimah"
      },
      {
        "id": "حجة_وشحة",
        "nameAr": "وشحة",
        "nameEn": "Wishhah"
      },
      {
        "id": "حجة_الشغادرة",
        "nameAr": "الشغادرة",
        "nameEn": "Al-Shaghadrah"
      },
      {
        "id": "حجة_المحابشة",
        "nameAr": "المحابشة",
        "nameEn": "Al-Mahabishah"
      },
      {
        "id": "حجة_المغربة",
        "nameAr": "المغربة",
        "nameEn": "Al-Maghribah"
      },
      {
        "id": "حجة_المفتاح",
        "nameAr": "المفتاح",
        "nameEn": "Al-Miftah"
      },
      {
        "id": "حجة_حرض",
        "nameAr": "حرض",
        "nameEn": "Haradh"
      },
      {
        "id": "حجة_حيران",
        "nameAr": "حيران",
        "nameEn": "Hairan"
      },
      {
        "id": "حجة_كشر",
        "nameAr": "كشر",
        "nameEn": "Koshar"
      },
      {
        "id": "حجة_شرس",
        "nameAr": "شرس",
        "nameEn": "Sharis"
      },
      {
        "id": "حجة_عبس",
        "nameAr": "عبس",
        "nameEn": "Abs"
      },
      {
        "id": "حجة_كعيدنة",
        "nameAr": "كعيدنة",
        "nameEn": "Koa'dnah"
      },
      {
        "id": "حجة_مبين",
        "nameAr": "مبين",
        "nameEn": "Mabian"
      },
      {
        "id": "حجة_الشاهل",
        "nameAr": "الشاهل",
        "nameEn": "Al-Shahil"
      },
      {
        "id": "حجة_وضرة",
        "nameAr": "وضرة",
        "nameEn": "Wdhrah"
      },
      {
        "id": "حجة_مستباء",
        "nameAr": "مستباء",
        "nameEn": "Mostaba'"
      },
      {
        "id": "حجة_ميدي",
        "nameAr": "ميدي",
        "nameEn": "Meedi"
      },
      {
        "id": "حجة_نجرة",
        "nameAr": "نجرة",
        "nameEn": "Najrah"
      }
    ]
  },
  {
    "id": "إب",
    "nameAr": "إب",
    "nameEn": "Ibb",
    "districts": [
      {
        "id": "إب_العدين",
        "nameAr": "العدين",
        "nameEn": "Al-Odain"
      },
      {
        "id": "إب_إب",
        "nameAr": "إب",
        "nameEn": "Ibb"
      },
      {
        "id": "إب_بعدان",
        "nameAr": "بعدان",
        "nameEn": "Ba'dan"
      },
      {
        "id": "إب_جبلة",
        "nameAr": "جبلة",
        "nameEn": "Jiblah"
      },
      {
        "id": "إب_النادرة",
        "nameAr": "النادرة",
        "nameEn": "Al-Nadrah"
      },
      {
        "id": "إب_حبيش",
        "nameAr": "حبيش",
        "nameEn": "Hobaish"
      },
      {
        "id": "إب_حزم العدين",
        "nameAr": "حزم العدين",
        "nameEn": "Hazm Al-Odain"
      },
      {
        "id": "إب_ذي السفال",
        "nameAr": "ذي السفال",
        "nameEn": "Thi Al-Sufal"
      },
      {
        "id": "إب_الرضمة",
        "nameAr": "الرضمة",
        "nameEn": "Al-Radhmah"
      },
      {
        "id": "إب_السبرة",
        "nameAr": "السبرة",
        "nameEn": "Al-Sabrah"
      },
      {
        "id": "إب_السدة",
        "nameAr": "السدة",
        "nameEn": "Al-Saddah"
      },
      {
        "id": "إب_السياني",
        "nameAr": "السياني",
        "nameEn": "Al-Syiani"
      },
      {
        "id": "إب_الشعر",
        "nameAr": "الشعر",
        "nameEn": "Al-Sha'ir"
      },
      {
        "id": "إب_الظهار",
        "nameAr": "الظهار",
        "nameEn": "Al-Dhahar"
      },
      {
        "id": "إب_فرع العدين",
        "nameAr": "فرع العدين",
        "nameEn": "Fara' Al-Odain"
      },
      {
        "id": "إب_القفر",
        "nameAr": "القفر",
        "nameEn": "Al-Qafr"
      },
      {
        "id": "إب_المخادر",
        "nameAr": "المخادر",
        "nameEn": "Al-Makhadrh"
      },
      {
        "id": "إب_مذيخرة",
        "nameAr": "مذيخرة",
        "nameEn": "Mothaikhrah"
      },
      {
        "id": "إب_المشنة",
        "nameAr": "المشنة",
        "nameEn": "Al-Mashnnah"
      },
      {
        "id": "إب_يريم",
        "nameAr": "يريم",
        "nameEn": "Yareem"
      }
    ]
  },
  {
    "id": "صعدة",
    "nameAr": "صعدة",
    "nameEn": "Sa'dah",
    "districts": [
      {
        "id": "صعدة_الحشوة",
        "nameAr": "الحشوة",
        "nameEn": "Al-Hishwah"
      },
      {
        "id": "صعدة_الصفراء",
        "nameAr": "الصفراء",
        "nameEn": "Al-Safra'a"
      },
      {
        "id": "صعدة_الظاهر",
        "nameAr": "الظاهر",
        "nameEn": "Al-Dhahir"
      },
      {
        "id": "صعدة_باقم",
        "nameAr": "باقم",
        "nameEn": "Baqim"
      },
      {
        "id": "صعدة_حيدان",
        "nameAr": "حيدان",
        "nameEn": "Haidan"
      },
      {
        "id": "صعدة_رازح",
        "nameAr": "رازح",
        "nameEn": "Razih"
      },
      {
        "id": "صعدة_ساقين",
        "nameAr": "ساقين",
        "nameEn": "Saqain"
      },
      {
        "id": "صعدة_سحار",
        "nameAr": "سحار",
        "nameEn": "Sahar"
      },
      {
        "id": "صعدة_شداء",
        "nameAr": "شداء",
        "nameEn": "Shida'a"
      },
      {
        "id": "صعدة_صعدة",
        "nameAr": "صعدة",
        "nameEn": "Sa'dah"
      },
      {
        "id": "صعدة_غمر",
        "nameAr": "غمر",
        "nameEn": "Ghamer"
      },
      {
        "id": "صعدة_قطابر",
        "nameAr": "قطابر",
        "nameEn": "Qatabir"
      },
      {
        "id": "صعدة_كتاف والبقع",
        "nameAr": "كتاف والبقع",
        "nameEn": "Kitaf and Bog'"
      },
      {
        "id": "صعدة_مجز",
        "nameAr": "مجز",
        "nameEn": "Majz"
      },
      {
        "id": "صعدة_منبه",
        "nameAr": "منبه",
        "nameEn": "Munabbih"
      }
    ]
  },
  {
    "id": "البيضاء",
    "nameAr": "البيضاء",
    "nameEn": "Al-Baidha",
    "districts": [
      {
        "id": "البيضاء_مدينة البيضاء",
        "nameAr": "مدينة البيضاء",
        "nameEn": "Al-Baidha City"
      },
      {
        "id": "البيضاء_البيضاء",
        "nameAr": "البيضاء",
        "nameEn": "Al-Baidha"
      },
      {
        "id": "البيضاء_الزاهر",
        "nameAr": "الزاهر",
        "nameEn": "Al-Zaher"
      },
      {
        "id": "البيضاء_ردمان",
        "nameAr": "ردمان",
        "nameEn": "Radman"
      },
      {
        "id": "البيضاء_الرياشية",
        "nameAr": "الرياشية",
        "nameEn": "Al-Riashiah"
      },
      {
        "id": "البيضاء_السوادية",
        "nameAr": "السوادية",
        "nameEn": "Al-Swadiah"
      },
      {
        "id": "البيضاء_الشرية",
        "nameAr": "الشرية",
        "nameEn": "Al-Shariah"
      },
      {
        "id": "البيضاء_صباح",
        "nameAr": "صباح",
        "nameEn": "Sabah"
      },
      {
        "id": "البيضاء_الصومعة",
        "nameAr": "الصومعة",
        "nameEn": "Al-Sawma'ah"
      },
      {
        "id": "البيضاء_الطفة",
        "nameAr": "الطفة",
        "nameEn": "Al-Tiffah"
      },
      {
        "id": "البيضاء_العرش",
        "nameAr": "العرش",
        "nameEn": "Al-Arsh"
      },
      {
        "id": "البيضاء_القريشية",
        "nameAr": "القريشية",
        "nameEn": "Al-Qurishiah"
      },
      {
        "id": "البيضاء_ذي ناعم",
        "nameAr": "ذي ناعم",
        "nameEn": "Thi Na'em"
      },
      {
        "id": "البيضاء_مسورة",
        "nameAr": "مسورة",
        "nameEn": "Maswarah"
      },
      {
        "id": "البيضاء_مكيراس",
        "nameAr": "مكيراس",
        "nameEn": "Mukiras"
      },
      {
        "id": "البيضاء_الملاجم",
        "nameAr": "الملاجم",
        "nameEn": "Al-Malajim"
      },
      {
        "id": "البيضاء_ناطع",
        "nameAr": "ناطع",
        "nameEn": "Nati'"
      },
      {
        "id": "البيضاء_نعمان",
        "nameAr": "نعمان",
        "nameEn": "Na'man"
      },
      {
        "id": "البيضاء_ولد ربيع",
        "nameAr": "ولد ربيع",
        "nameEn": "Wild Rabee'"
      },
      {
        "id": "البيضاء_رداع",
        "nameAr": "رداع",
        "nameEn": "Rada'"
      }
    ]
  },
  {
    "id": "شبوة",
    "nameAr": "شبوة",
    "nameEn": "Shabwah",
    "districts": [
      {
        "id": "شبوة_الروضة",
        "nameAr": "الروضة",
        "nameEn": "Al-Rawdhah"
      },
      {
        "id": "شبوة_بيحان",
        "nameAr": "بيحان",
        "nameEn": "Bayhan"
      },
      {
        "id": "شبوة_جردان",
        "nameAr": "جردان",
        "nameEn": "Jardan"
      },
      {
        "id": "شبوة_حبان",
        "nameAr": "حبان",
        "nameEn": "Habban"
      },
      {
        "id": "شبوة_عين",
        "nameAr": "عين",
        "nameEn": "Ain"
      },
      {
        "id": "شبوة_حطيب",
        "nameAr": "حطيب",
        "nameEn": "Hotaib"
      },
      {
        "id": "شبوة_دهر",
        "nameAr": "دهر",
        "nameEn": "Duhur"
      },
      {
        "id": "شبوة_رضوم",
        "nameAr": "رضوم",
        "nameEn": "Rudhoom"
      },
      {
        "id": "شبوة_الصعيد",
        "nameAr": "الصعيد",
        "nameEn": "Al-Sa'eed"
      },
      {
        "id": "شبوة_الطلح",
        "nameAr": "الطلح",
        "nameEn": "Al-Talh"
      },
      {
        "id": "شبوة_عتق",
        "nameAr": "عتق",
        "nameEn": "Ataq"
      },
      {
        "id": "شبوة_عرماء",
        "nameAr": "عرماء",
        "nameEn": "Arma'"
      },
      {
        "id": "شبوة_عسيلان",
        "nameAr": "عسيلان",
        "nameEn": "Osailan"
      },
      {
        "id": "شبوة_مرخة السفلى",
        "nameAr": "مرخة السفلى",
        "nameEn": "Markhah Al-Sofla"
      },
      {
        "id": "شبوة_مرخة العليا",
        "nameAr": "مرخة العليا",
        "nameEn": "Markhah Al-Olia"
      },
      {
        "id": "شبوة_ميفعة",
        "nameAr": "ميفعة",
        "nameEn": "Maifa'h"
      },
      {
        "id": "شبوة_نصاب",
        "nameAr": "نصاب",
        "nameEn": "Nesab"
      }
    ]
  },
  {
    "id": "تعز",
    "nameAr": "تعز",
    "nameEn": "Taiz",
    "districts": [
      {
        "id": "تعز_ماوية",
        "nameAr": "ماوية",
        "nameEn": "Mawiah"
      },
      {
        "id": "تعز_شرعب السلام",
        "nameAr": "شرعب السلام",
        "nameEn": "Shara'b Al-Salam"
      },
      {
        "id": "تعز_شرعب الرونة",
        "nameAr": "شرعب الرونة",
        "nameEn": "Shara'b Al-Rawnah"
      },
      {
        "id": "تعز_مقبنة",
        "nameAr": "مقبنة",
        "nameEn": "Maqbana"
      },
      {
        "id": "تعز_المخا",
        "nameAr": "المخا",
        "nameEn": "Al-Makha"
      },
      {
        "id": "تعز_ذباب",
        "nameAr": "ذباب",
        "nameEn": "Thubab"
      },
      {
        "id": "تعز_موزع",
        "nameAr": "موزع",
        "nameEn": "Mawza'"
      },
      {
        "id": "تعز_جبل حبشي",
        "nameAr": "جبل حبشي",
        "nameEn": "Habashi Mountain"
      },
      {
        "id": "تعز_مشرعة وحدنان",
        "nameAr": "مشرعة وحدنان",
        "nameEn": "Mashra'a and Hadnan"
      },
      {
        "id": "تعز_صبر الموادم",
        "nameAr": "صبر الموادم",
        "nameEn": "Saber Al-Mawadim"
      },
      {
        "id": "تعز_المسراخ",
        "nameAr": "المسراخ",
        "nameEn": "Al-Misrakh"
      },
      {
        "id": "تعز_خدير",
        "nameAr": "خدير",
        "nameEn": "Khadeer"
      },
      {
        "id": "تعز_الصلو",
        "nameAr": "الصلو",
        "nameEn": "Al-Selw"
      },
      {
        "id": "تعز_الشمايتين",
        "nameAr": "الشمايتين",
        "nameEn": "Al-Shamaiatain"
      },
      {
        "id": "تعز_الوازعية",
        "nameAr": "الوازعية",
        "nameEn": "Al-Waz'iah"
      },
      {
        "id": "تعز_حيفان",
        "nameAr": "حيفان",
        "nameEn": "Haifan"
      },
      {
        "id": "تعز_المظفر",
        "nameAr": "المظفر",
        "nameEn": "Al-Mathfar"
      },
      {
        "id": "تعز_القاهرة",
        "nameAr": "القاهرة",
        "nameEn": "Al-Qahera"
      },
      {
        "id": "تعز_صالة",
        "nameAr": "صالة",
        "nameEn": "Salah"
      },
      {
        "id": "تعز_التعزية",
        "nameAr": "التعزية",
        "nameEn": "Al-Taiziah"
      },
      {
        "id": "تعز_المعافر",
        "nameAr": "المعافر",
        "nameEn": "Al-Ma'afer"
      },
      {
        "id": "تعز_المواسط",
        "nameAr": "المواسط",
        "nameEn": "Al-Mawasit"
      },
      {
        "id": "تعز_سامع",
        "nameAr": "سامع",
        "nameEn": "Sama'"
      }
    ]
  },
  {
    "id": "الجوف",
    "nameAr": "الجوف",
    "nameEn": "Al-jawf",
    "districts": [
      {
        "id": "الجوف_برط العنان",
        "nameAr": "برط العنان",
        "nameEn": "Barat Al-enan"
      },
      {
        "id": "الجوف_الحزم",
        "nameAr": "الحزم",
        "nameEn": "Al-Hazm"
      },
      {
        "id": "الجوف_الحميدات",
        "nameAr": "الحميدات",
        "nameEn": "Al-Humaidat"
      },
      {
        "id": "الجوف_خب والشعف",
        "nameAr": "خب والشعف",
        "nameEn": "Khab and Al-Sha'af"
      },
      {
        "id": "الجوف_خراب المراشي",
        "nameAr": "خراب المراشي",
        "nameEn": "Kharab Al-Marashi"
      },
      {
        "id": "الجوف_الخلق",
        "nameAr": "الخلق",
        "nameEn": "Al-Khalq"
      },
      {
        "id": "الجوف_رجوزة",
        "nameAr": "رجوزة",
        "nameEn": "Rajozah"
      },
      {
        "id": "الجوف_الزاهر",
        "nameAr": "الزاهر",
        "nameEn": "Al-Zaher"
      },
      {
        "id": "الجوف_الغيل",
        "nameAr": "الغيل",
        "nameEn": "Al-Ghail"
      },
      {
        "id": "الجوف_المتون",
        "nameAr": "المتون",
        "nameEn": "Al-Mutoon"
      },
      {
        "id": "الجوف_المصلوب",
        "nameAr": "المصلوب",
        "nameEn": "Al-Masloob"
      },
      {
        "id": "الجوف_المطمة",
        "nameAr": "المطمة",
        "nameEn": "Al-Matmmah"
      }
    ]
  },
  {
    "id": "مأرب",
    "nameAr": "مأرب",
    "nameEn": "Ma'rib",
    "districts": [
      {
        "id": "مأرب_بدبدة",
        "nameAr": "بدبدة",
        "nameEn": "Bedbedah"
      },
      {
        "id": "مأرب_جبل مراد",
        "nameAr": "جبل مراد",
        "nameEn": "Morad Mountain"
      },
      {
        "id": "مأرب_مدغل الجدعان",
        "nameAr": "مدغل الجدعان",
        "nameEn": "Madghal Al-Gida'an"
      },
      {
        "id": "مأرب_مدينة مأرب",
        "nameAr": "مدينة مأرب",
        "nameEn": "Ma'rib City"
      },
      {
        "id": "مأرب_حريب",
        "nameAr": "حريب",
        "nameEn": "Hareeb"
      },
      {
        "id": "مأرب_حريب القرامش",
        "nameAr": "حريب القرامش",
        "nameEn": "Hareeb Al-Qaramish"
      },
      {
        "id": "مأرب_رحبة",
        "nameAr": "رحبة",
        "nameEn": "Rahabah"
      },
      {
        "id": "مأرب_رغوان",
        "nameAr": "رغوان",
        "nameEn": "Raghwan"
      },
      {
        "id": "مأرب_صرواح",
        "nameAr": "صرواح",
        "nameEn": "Sirwah"
      },
      {
        "id": "مأرب_العبدية",
        "nameAr": "العبدية",
        "nameEn": "Al-Abdiah"
      },
      {
        "id": "مأرب_ماهلية",
        "nameAr": "ماهلية",
        "nameEn": "Mahliah"
      },
      {
        "id": "مأرب_الجوبة",
        "nameAr": "الجوبة",
        "nameEn": "Al-Jobah"
      },
      {
        "id": "مأرب_مجزر",
        "nameAr": "مجزر",
        "nameEn": "Majzar"
      },
      {
        "id": "مأرب_مأرب",
        "nameAr": "مأرب",
        "nameEn": "Ma'rib"
      }
    ]
  },
  {
    "id": "حضرموت",
    "nameAr": "حضرموت",
    "nameEn": "Hadramot",
    "districts": [
      {
        "id": "حضرموت_المكلا",
        "nameAr": "المكلا",
        "nameEn": "Al-Mokalla"
      },
      {
        "id": "حضرموت_ثمود",
        "nameAr": "ثمود",
        "nameEn": "Thamood"
      },
      {
        "id": "حضرموت_القف",
        "nameAr": "القف",
        "nameEn": "Al-Qaf"
      },
      {
        "id": "حضرموت_زمخ ومنوخ",
        "nameAr": "زمخ ومنوخ",
        "nameEn": "Zamakh and Manookh"
      },
      {
        "id": "حضرموت_حجر",
        "nameAr": "حجر",
        "nameEn": "Hajr"
      },
      {
        "id": "حضرموت_العبر",
        "nameAr": "العبر",
        "nameEn": "Al-Abr"
      },
      {
        "id": "حضرموت_القطن",
        "nameAr": "القطن",
        "nameEn": "Al-Qatn"
      },
      {
        "id": "حضرموت_شبام",
        "nameAr": "شبام",
        "nameEn": "Shibam"
      },
      {
        "id": "حضرموت_ساه",
        "nameAr": "ساه",
        "nameEn": "Sah"
      },
      {
        "id": "حضرموت_سيئون",
        "nameAr": "سيئون",
        "nameEn": "Say'on"
      },
      {
        "id": "حضرموت_تريم",
        "nameAr": "تريم",
        "nameEn": "Tarim"
      },
      {
        "id": "حضرموت_السوم",
        "nameAr": "السوم",
        "nameEn": "Al-Soom"
      },
      {
        "id": "حضرموت_الريدة وقصيعر",
        "nameAr": "الريدة وقصيعر",
        "nameEn": "Al-Raidah and Qusaier"
      },
      {
        "id": "حضرموت_الديس",
        "nameAr": "الديس",
        "nameEn": "Al-Dais"
      },
      {
        "id": "حضرموت_الشحر",
        "nameAr": "الشحر",
        "nameEn": "Al-Shihr"
      },
      {
        "id": "حضرموت_غيل بن يمين",
        "nameAr": "غيل بن يمين",
        "nameEn": "Ghail Bin Yameen"
      },
      {
        "id": "حضرموت_غيل باوزير",
        "nameAr": "غيل باوزير",
        "nameEn": "Ghail Ba Wazeer"
      },
      {
        "id": "حضرموت_دوعن",
        "nameAr": "دوعن",
        "nameEn": "Dawa'an"
      },
      {
        "id": "حضرموت_عمد",
        "nameAr": "عمد",
        "nameEn": "Amd"
      },
      {
        "id": "حضرموت_حورة ووادي العين",
        "nameAr": "حورة ووادي العين",
        "nameEn": "Al-Ayn Valley"
      },
      {
        "id": "حضرموت_رخية",
        "nameAr": "رخية",
        "nameEn": "Raikhyah"
      },
      {
        "id": "حضرموت_يبعث",
        "nameAr": "يبعث",
        "nameEn": "Yabo'th"
      },
      {
        "id": "حضرموت_حجر الصيعر",
        "nameAr": "حجر الصيعر",
        "nameEn": "Hajar Al-Saia'ar"
      },
      {
        "id": "حضرموت_بروم ميفع",
        "nameAr": "بروم ميفع",
        "nameEn": "Barom Maifa'a"
      },
      {
        "id": "حضرموت_الضليعة",
        "nameAr": "الضليعة",
        "nameEn": "Al-Dhlia'ah"
      },
      {
        "id": "حضرموت_رماه",
        "nameAr": "رماه",
        "nameEn": "Rumah"
      },
      {
        "id": "حضرموت_حريضة",
        "nameAr": "حريضة",
        "nameEn": "Huridhah"
      },
      {
        "id": "حضرموت_مدينة المكلا",
        "nameAr": "مدينة المكلا",
        "nameEn": "Al-Mokalla City"
      }
    ]
  },
  {
    "id": "المهرة",
    "nameAr": "المهرة",
    "nameEn": "Al-Maharah",
    "districts": [
      {
        "id": "المهرة_حات",
        "nameAr": "حات",
        "nameEn": "Haat"
      },
      {
        "id": "المهرة_حصوين",
        "nameAr": "حصوين",
        "nameEn": "Hsween"
      },
      {
        "id": "المهرة_حوف",
        "nameAr": "حوف",
        "nameEn": "Hawf"
      },
      {
        "id": "المهرة_سيحوت",
        "nameAr": "سيحوت",
        "nameEn": "Syhoot"
      },
      {
        "id": "المهرة_شحن",
        "nameAr": "شحن",
        "nameEn": "Shihin"
      },
      {
        "id": "المهرة_الغيضة",
        "nameAr": "الغيضة",
        "nameEn": "Al-Ghaidhah"
      },
      {
        "id": "المهرة_قشن",
        "nameAr": "قشن",
        "nameEn": "Qashn"
      },
      {
        "id": "المهرة_المسيلة",
        "nameAr": "المسيلة",
        "nameEn": "Al-Masilah"
      },
      {
        "id": "المهرة_منعر",
        "nameAr": "منعر",
        "nameEn": "Man'r"
      }
    ]
  },
  {
    "id": "الضالع",
    "nameAr": "الضالع",
    "nameEn": "Al-Dhale'",
    "districts": [
      {
        "id": "الضالع_الأزارق",
        "nameAr": "الأزارق",
        "nameEn": "Al-Azariq"
      },
      {
        "id": "الضالع_الحشاء",
        "nameAr": "الحشاء",
        "nameEn": "Al-Hasha'"
      },
      {
        "id": "الضالع_الحصين",
        "nameAr": "الحصين",
        "nameEn": "Al-Hosain"
      },
      {
        "id": "الضالع_الشعيب",
        "nameAr": "الشعيب",
        "nameEn": "Al-Sho'aib"
      },
      {
        "id": "الضالع_الضالع",
        "nameAr": "الضالع",
        "nameEn": "Al-Dhale'"
      },
      {
        "id": "الضالع_جبن",
        "nameAr": "جبن",
        "nameEn": "Joban"
      },
      {
        "id": "الضالع_جحاف",
        "nameAr": "جحاف",
        "nameEn": "Jehaf"
      },
      {
        "id": "الضالع_دمت",
        "nameAr": "دمت",
        "nameEn": "Damt"
      },
      {
        "id": "الضالع_قعطبة",
        "nameAr": "قعطبة",
        "nameEn": "Qa'tabah"
      }
    ]
  },
  {
    "id": "المحويت",
    "nameAr": "المحويت",
    "nameEn": "Al-Mahweet",
    "districts": [
      {
        "id": "المحويت_ملحان",
        "nameAr": "ملحان",
        "nameEn": "Melhan"
      },
      {
        "id": "المحويت_الخبت",
        "nameAr": "الخبت",
        "nameEn": "Al-Khabt"
      },
      {
        "id": "المحويت_الطويلة",
        "nameAr": "الطويلة",
        "nameEn": "Al-Tawilah"
      },
      {
        "id": "المحويت_بني سعد",
        "nameAr": "بني سعد",
        "nameEn": "Bni Sa'd"
      },
      {
        "id": "المحويت_الرجم",
        "nameAr": "الرجم",
        "nameEn": "Al-Rojom"
      },
      {
        "id": "المحويت_المحويت",
        "nameAr": "المحويت",
        "nameEn": "Al-Mahweet"
      },
      {
        "id": "المحويت_مدينة المحويت",
        "nameAr": "مدينة المحويت",
        "nameEn": "Al-Mahweet City"
      },
      {
        "id": "المحويت_شبام كوكبان",
        "nameAr": "شبام كوكبان",
        "nameEn": "Shibam Kawkaban"
      },
      {
        "id": "المحويت_حفاش",
        "nameAr": "حفاش",
        "nameEn": "Hofash"
      }
    ]
  },
  {
    "id": "لحج",
    "nameAr": "لحج",
    "nameEn": "Lahj",
    "districts": [
      {
        "id": "لحج_الحد",
        "nameAr": "الحد",
        "nameEn": "Al-Had"
      },
      {
        "id": "لحج_الحوطة",
        "nameAr": "الحوطة",
        "nameEn": "Al-Hotah"
      },
      {
        "id": "لحج_القبيطة",
        "nameAr": "القبيطة",
        "nameEn": "Al-Qabbaytah"
      },
      {
        "id": "لحج_المسيمير",
        "nameAr": "المسيمير",
        "nameEn": "Al-Mosaimeer"
      },
      {
        "id": "لحج_المضاربة والعارة",
        "nameAr": "المضاربة والعارة",
        "nameEn": "Al-Madharaba and Al-A'ara"
      },
      {
        "id": "لحج_المفلحي",
        "nameAr": "المفلحي",
        "nameEn": "Al-Muflhi"
      },
      {
        "id": "لحج_المقاطرة",
        "nameAr": "المقاطرة",
        "nameEn": "Al-Maqatirah"
      },
      {
        "id": "لحج_الملاح",
        "nameAr": "الملاح",
        "nameEn": "Al-Milah"
      },
      {
        "id": "لحج_تبن",
        "nameAr": "تبن",
        "nameEn": "Tbn"
      },
      {
        "id": "لحج_حالمين",
        "nameAr": "حالمين",
        "nameEn": "Halimain"
      },
      {
        "id": "لحج_حبيل جبر",
        "nameAr": "حبيل جبر",
        "nameEn": "Hobail Jabr"
      },
      {
        "id": "لحج_ردفان",
        "nameAr": "ردفان",
        "nameEn": "Radfan"
      },
      {
        "id": "لحج_طور الباحة",
        "nameAr": "طور الباحة",
        "nameEn": "Toor Al-Baha"
      },
      {
        "id": "لحج_يافع",
        "nameAr": "يافع",
        "nameEn": "Yafe'"
      },
      {
        "id": "لحج_يهر",
        "nameAr": "يهر",
        "nameEn": "Yahar"
      }
    ]
  },
  {
    "id": "ريمة",
    "nameAr": "ريمة",
    "nameEn": "Raimah",
    "districts": [
      {
        "id": "ريمة_بلاد الطعام",
        "nameAr": "بلاد الطعام",
        "nameEn": "Bilad Al-Ta'am"
      },
      {
        "id": "ريمة_السلفية",
        "nameAr": "السلفية",
        "nameEn": "Al-Salfiah"
      },
      {
        "id": "ريمة_الجبين",
        "nameAr": "الجبين",
        "nameEn": "Al-Jabeen"
      },
      {
        "id": "ريمة_مزهر",
        "nameAr": "مزهر",
        "nameEn": "Mizhir"
      },
      {
        "id": "ريمة_كسمة",
        "nameAr": "كسمة",
        "nameEn": "Kosmah"
      },
      {
        "id": "ريمة_الجعفرية",
        "nameAr": "الجعفرية",
        "nameEn": "Al-ja'faria"
      }
    ]
  },
  {
    "id": "سقطرى",
    "nameAr": "سقطرى",
    "nameEn": "Socatra",
    "districts": [
      {
        "id": "سقطرى_حديبو",
        "nameAr": "حديبو",
        "nameEn": "Hadibu"
      },
      {
        "id": "سقطرى_قلنسية وعبد الكوري",
        "nameAr": "قلنسية وعبد الكوري",
        "nameEn": "Qulansiyah and 'Abd-al-Kuri"
      }
    ]
  },
  {
    "id": "أبين",
    "nameAr": "أبين",
    "nameEn": "Abyan",
    "districts": [
      {
        "id": "أبين_مودية",
        "nameAr": "مودية",
        "nameEn": "Mudiyah"
      },
      {
        "id": "أبين_المحفد",
        "nameAr": "المحفد",
        "nameEn": "Al Mahfid"
      },
      {
        "id": "أبين_جيشان",
        "nameAr": "جيشان",
        "nameEn": "Jayshan"
      },
      {
        "id": "أبين_لودر",
        "nameAr": "لودر",
        "nameEn": "Lawdar"
      },
      {
        "id": "أبين_سباح",
        "nameAr": "سباح",
        "nameEn": "Sabah"
      },
      {
        "id": "أبين_رصد",
        "nameAr": "رصد",
        "nameEn": "Rusud"
      },
      {
        "id": "أبين_سرار",
        "nameAr": "سرار",
        "nameEn": "Sarar"
      },
      {
        "id": "أبين_الوضيع",
        "nameAr": "الوضيع",
        "nameEn": "Al-Wadhi'"
      },
      {
        "id": "أبين_أحور",
        "nameAr": "أحور",
        "nameEn": "Ahwar"
      },
      {
        "id": "أبين_زنجبار",
        "nameAr": "زنجبار",
        "nameEn": "Zunjubar"
      },
      {
        "id": "أبين_خنفر",
        "nameAr": "خنفر",
        "nameEn": "Khanfar"
      }
    ]
  }
];
