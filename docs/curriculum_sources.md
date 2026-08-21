# مصادر المناهج والبيانات الجغرافية

## بوابة المناهج

- بوابة التعليم الإلكتروني التابعة لوزارة التربية والتعليم اليمنية: http://e-learning-moe.edu.ye/book.php
- صفحات الكتب المدرسية التي تم الرجوع إليها عبر موقع الأمجاد التعليمي، وهي مصادر تجميعية وليست بديلاً عن التحقق من الإصدار الرسمي: https://www.al-amgaad.com/2022/08/all-books-yemen.html

## بيانات المحافظات والمديريات

- مستودع YemenOpenSource لبيانات اليمن: https://github.com/YemenOpenSource/Yemen-info/blob/main/yemen-info.json
- نسخة البيانات المستخدمة داخل المشروع: `src/lib/yemenData.ts`

## ملاحظة حقوق الاستخدام

الملفات المعالجة محلياً أُنشئت من نسخ PDF متاحة عبر المصادر المذكورة. قبل نشرها تجارياً أو إعادة توزيعها داخل تطبيق عام، يجب الحصول على إذن الجهة المالكة للمحتوى أو الالتزام بشروط النشر الرسمية. التطبيق مصمم ليحفظ ملفات PDF وJSON في Firebase Storage، ولا يضمها داخل حزمة الويب.

## نتائج التحقق الإضافية — 21 أغسطس 2026

### مصدر رسمي تم التحقق منه

بوابة الإدارة العامة للتعليم الإلكتروني التابعة لوزارة التربية والتعليم اليمنية توفر صفحات وروابط PDF مباشرة للكتب التالية:

- الصف السابع: http://e-learning-moe.edu.ye/ClassSeven.php
- الصف العاشر / الأول الثانوي: http://e-learning-moe.edu.ye/ClassTen.php
- الصف الحادي عشر / الثاني الثانوي: http://e-learning-moe.edu.ye/ClassEleven.php
- الصف الثاني عشر / الثالث الثانوي: http://e-learning-moe.edu.ye/ClassTwelve.php

أمثلة روابط رسمية تم التحقق منها:

- الصف السابع قرآن: https://e-learning-moe.edu.ye/adel/android_1/book_7/quran_7th.pdf
- الصف السابع رياضيات: https://e-learning-moe.edu.ye/adel/android_1/book_7/mathematic_7th.pdf
- الصف السابع علوم ج1: https://e-learning-moe.edu.ye/adel/android_1/book_7/science_7th.pdf
- الصف العاشر قرآن: https://e-learning-moe.edu.ye/adel/android_1/book_10/holy_quran_10th.pdf
- الصف العاشر رياضيات ج1: https://e-learning-moe.edu.ye/adel/android_1/book_10/mathematic_part1_10th.pdf
- الصف الحادي عشر قرآن: https://e-learning-moe.edu.ye/adel/android_1/book_11/holy_quran_part1_11th.pdf
- الصف الحادي عشر فيزياء: https://e-learning-moe.edu.ye/adel/android_1/book_11/physical_11th.pdf
- الصف الثاني عشر قرآن: https://e-learning-moe.edu.ye/adel/android_1/book_12/holy_quran_12th.pdf
- الصف الثاني عشر رياضيات علمي: https://e-learning-moe.edu.ye/adel/android_1/book_12/mathematic_12th.pdf
- الصف الثاني عشر فيزياء: https://e-learning-moe.edu.ye/adel/android_1/book_12/physical_12th.pdf

### الصفان الثامن والتاسع

لم تُتحقق في هذه الجولة من صفحة رسمية مطابقة للصفين الثامن والتاسع. يجب عدم اعتبار أي روابط تجميعية بديلاً رسمياً قبل فحص الإصدار والملف. يمكن استخدام صفحات YemenSchool أو حلول المناهج كمصادر احتياطية فقط مع حفظ `sourceType` و`sourceUrl` في manifest.

### حالة الملفات والاعتمادات

لم توجد ملفات PDF أو JSON معالجة محلياً في `/home/ubuntu/Edusmart` أو `/home/ubuntu/Downloads` وقت الفحص. كما أن اختبار قراءة Google Drive أعاد خطأ 401 بسبب عدم وجود بيانات اعتماد متصلة في الجلسة. ولا يوجد ملف `serviceAccountKey.json` في جذر المشروع. لذلك لم يُنفذ رفع فعلي إلى Firebase أو Google Drive حتى الآن، ولا ينبغي وصف المناهج بأنها مرفوعة قبل نجاح اختبار القراءة والكتابة والتحقق من الروابط.
