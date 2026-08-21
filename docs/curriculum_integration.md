# دمج المناهج في EduSmart

## المبدأ

لا تُضمّن ملفات الكتب داخل حزمة Vite ولا تُخزّن النصوص الكاملة داخل Firestore. يحتفظ Firebase Storage بملف PDF الأصلي وملف JSON المعالج صفحة بصفحة، بينما يحتفظ Firestore بسجل صغير في مجموعة `curriculumBooks` يحتوي على الصف والمادة والجزء وروابط Storage والوحدات والدروس.

```text
الطالب -> Firestore: كتالوج الكتاب حسب gradeKey
الطالب -> Storage: pages.json عند فتح القارئ
الطالب -> Storage: book.pdf عند الحاجة للعرض المرئي
المدير/مدير المدرسة -> Storage: رفع PDF وJSON
المدير/مدير المدرسة -> Firestore: تسجيل metadata فقط
```

## تجهيز الملفات

يُولد `data/curriculum_manifest.json` و`data/curriculum_books_seed.json` بواسطة:

```bash
python3 scripts/build_curriculum_manifest.py
python3 scripts/validate_curriculum_seed.py
```

كل سجل في seed يطابق كتاباً أو جزءاً، ويحتوي على `localPdfPath` و`localManifestPath`. ملفات JSON المعالجة الحالية هي المصدر الذي يرفعه الناشر في لوحة المدرسة.

## النشر من لوحة المدرسة

من لوحة المدير/مدير المدرسة افتح **ناشر مناهج المدرسة** ثم اختر:

1. عنوان الكتاب واسم المادة.
2. الصف من `YEMEN_GRADE_OPTIONS`، بما في ذلك العلمي والأدبي للثاني والثالث الثانوي.
3. الجزء الأول أو الثاني أو كتاب موحد.
4. ملف PDF الأصلي.
5. ملف JSON المعالج للكتاب نفسه.

يقوم `src/lib/curriculumPublisher.ts` برفع الملفين إلى:

```text
curriculum/{gradeKey}/{bookId}/book.pdf
curriculum/{gradeKey}/{bookId}/pages.json
```

ثم ينشئ السجل في `curriculumBooks`. قارئ الطالب يستخدم `loadBookPage` ولا يجلب إلا النص المفهرس عند الحاجة، مع ذاكرة مؤقتة داخل الجلسة.

## الحقول الأساسية في Firestore

| الحقل | الغرض |
|---|---|
| `gradeKey` | مفتاح ثابت للصف مثل `grade_7` أو `secondary_3_scientific` |
| `subject` | المادة الدراسية |
| `part` | `part_1` أو `part_2` أو `combined` |
| `pdfUrl` | رابط تنزيل/عرض PDF من Storage |
| `manifestUrl` | رابط JSON المعالج صفحة بصفحة |
| `totalPageCount` | عدد الصفحات المفهرسة |
| `units` | فهرس الوحدات والدروس ومداها الصفحي |
| `schoolId` / `schoolName` | تخصيص الكتاب لمدرسة، أو تركهما فارغين للمنهج العام |
| `source` و`isOfficial` | بيان مصدر النسخة قبل النشر |
| `createdBy` | المستخدم الذي نشر السجل |

## ربط الطالب بالمنهج

يُحفظ في ملف المستخدم `gradeKey` مع `schoolId` و`governorateId` و`districtId` عند اكتمال التسجيل. صفحة `StudentCurriculums` تستعلم عن `curriculumBooks` حسب `gradeKey` ثم تستبعد الكتب المخصصة لمدرسة أخرى. المنهج العام الذي لا يملك `schoolId` يظهر لكل طالب من الصف نفسه.

## قواعد Firebase

تمت إضافة:

- `match /curriculumBooks/{bookId}` إلى `firestore.rules`.
- `storage.rules` لمسار المناهج، بحيث تكون القراءة للمستخدم المسجل والكتابة للأدوار المخولة فقط، مع حد 250MB للملف والسماح بـ PDF وJSON فقط.

هذا المستودع لا يحتوي على `firebase.json` للنشر التلقائي؛ لذلك يجب نشر القواعد من بيئة Firebase المرتبطة بالمشروع أو نسخها إلى إعداد النشر لديك قبل تجربة الرفع.

## ملاحظة مهمة عن Gemini

المشروع الحالي يستدعي Gemini من مكونات الواجهة باستخدام `process.env.GEMINI_API_KEY`. هذا مناسب للتجربة المحلية فقط، لأن أي مفتاح يصل إلى المتصفح يمكن استخراجه. قبل النشر العام يجب نقل استدعاءات الشرح وتوليد الأسئلة إلى Cloud Function أو API خادم، مع التحقق من هوية الطالب وحدود الاستخدام وتسجيل التكلفة. ملفات المناهج نفسها لا تحتاج إلى وضع المفتاح داخل التطبيق.

## حقوق النشر

قبل نشر الكتب أو إعادة توزيعها تجارياً داخل تطبيق عام، يجب توثيق إذن الجهة المالكة أو شروط المصدر الرسمي. يوصى بحفظ `source` و`publisher` و`contentVersion` و`academicYear` مع كل نسخة، وعدم الادعاء بأنها أحدث طبعة إلا بعد التحقق من صفحة الإصدار الرسمية.
