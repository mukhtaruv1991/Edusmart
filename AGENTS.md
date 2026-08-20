# EduSmart AI Connect - وثيقة المشروع وخطة التطوير الشاملة (Project Blueprint & Master Roadmap)

## 1. نظرة عامة على المشروع (Project Overview & Tech Stack)
**EduSmart AI Connect** هي منصة ومنظومة تعليمية ذكية وشاملة لإدارة المدارس والتعلم الإلكتروني الذكي (Smart LMS & EdTech Multi-Tenant Platform)، صُممت لتناسب المدارس والمجمعات التعليمية ووزارات التربية والتعليم، وتعتمد على التقنيات التالية:
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend & Cloud Persistence**: Firebase Firestore (Multi-tenant DB with hierarchical indexing) & Firebase Authentication (Email/Password + Google OAuth).
- **AI Engine**: Google Gemini API (2.5 Flash / Flash Lite) for context explanations, smart summarization, adaptive quiz generation, and OCR text processing.
- **Architecture**: Multi-Role RBAC (Role-Based Access Control) with full geographical and institutional hierarchies (Governorate ➔ District ➔ School ➔ Class/Grade ➔ Section ➔ Students & Teachers & Parents).

---

## 2. الهيكلية الإدارية والربط المؤسسي (Organizational Hierarchy & Data Binding)

### التسلسل الهرمي للمنظومة:
$$\text{الإدارة العليا / الوزارة (Admin)} \longrightarrow \text{المحافظة (Governorate)} \longrightarrow \text{المديرية (District)} \longrightarrow \text{المدرسة (School)} \longrightarrow \text{الفصول والشعب (Grades & Sections)} \longrightarrow \text{المعلمون والطلاب وأولياء الأمور}$$

### آليات الربط في قواعد البيانات (Data Binding Schemas):
1. **ربط المدرسة والإدارة (`schools` Collection)**:
   - كل مدرسة تمتلك `schoolId`, `name`, `governorate`, `district`, `principalId`, ومصفوفة الفصول والمراحل المعتمدة.
2. **ربط المعلم (`users.role === 'teacher'`)**:
   - يرتبط بـ `schoolId` ومصفوفة الفصول والمواد الموكلة إليه `assignedClasses: [{ grade, section, subjectId }]`.
3. **ربط الطالب (`users.role === 'student'`)**:
   - يرتبط بـ `schoolId`, `governorate`, `district`, `grade` (الصف الدراسي), `section` (الشعبة), وكود الربط الفريد للابن `linkCode`.
   - يتم تحميل كتب ومناهج صفه الدراسي تلقائياً بناءً على حقل `grade`.
4. **ربط ولي الأمر بأبنائه (`users.role === 'parent'`)**:
   - يرتبط بمصفوفة معرّفات أبنائه `linkedStudentIds: [studentUid1, studentUid2]`.
   - يتم الربط إما بإدخال كود الربط الرقمي للابن (`linkCode`) أو من خلال اعتماد مدير المدرسة.
5. **المناهج والكتب التفاعلية (`curriculums` & `curriculum_units`)**:
   - الكتاب ➔ الوحدات (`units`) ➔ الدروس (`lessons`) ➔ نطاق أرقام الصفحات (`pageStart - pageEnd`) ➔ مذكرات المذاكرة المرتبطة (`study_notes`) ➔ سجل الاختبارات الذاتية (`study_quizzes`).

---

## 3. ما تم إنجازه واكتمل بنجاح 100% (Completed Modules & Features)

### أ. المصادقة والتهيئة (Auth & Multi-Step Onboarding):
- [x] تسجيل الدخول وإنشاء الحساب بالبريد وكلمة المرور مع كشف الأخطاء وحماية النوافذ.
- [x] تسجيل الدخول السريع عبر Google مع معالجة استثناءات `signInWithPopup`.
- [x] معالج التهيئة الجغرافي والأكاديمي (`Onboarding`) لاختيار الدور والمحافظة والمديرية والمدرسة والصف.
- [x] تهيئة اتصال موثوق لـ Firestore عبر `experimentalAutoDetectLongPolling` والتخزين المحلي المتعدد `persistentLocalCache`.

### ب. لوحة تحكم مدير المدرسة (Principal Dashboard):
- [x] إدارة الكادر التعليمي (إضافة، تعديل، توزيع المعلمين على الفصول والمواد).
- [x] إدارة الطلاب واعتماد طلبات التسجيل ونقل الفصول.
- [x] إدارة التقويم الأكاديمي والفعاليات المدرسية وجدول الحصص.
- [x] إدارة المالية المدرسية (تسجيل الرسوم، المصروفات، والإيرادات وحساب الأرصدة).
- [x] نظام التعاميم والتنبيهات المدرسية الموجهة (للطلاب أو المعلمين أو أولياء الأمور).
- [x] إدارة وتنظيم المسابقات والأنشطة الطلابية.

### ج. لوحة تحكم المعلم (Teacher Dashboard):
- [x] عرض الفصول المخصصة وقوائم الطلاب المسجلين وحالات الحضور والغياب.
- [x] بنك الأسئلة وإنشاء الاختبارات اليدوية بتحديد الأسئلة والخيارات والدرجات.
- [x] مولد الاختبارات الذكية التلقائي بالذكاء الاصطناعي (`ExamGenerator`) لأي درس أو موضوع.
- [x] رصد وتصحيح الدرجات وإضافة ملاحظات المعلم وإرسال الإشعارات.
- [x] المراسلة والتواصل المباشر مع أولياء أمور طلاب فصوله.

### د. لوحة تحكم الطالب ومنظومة المناهج الذكية (Student Dashboard & Smart LMS):
- [x] هيكل المناهج الشجري (الكتاب ➔ الوحدات ➔ الدروس ➔ نطاقات الصفحات).
- [x] القارئ التفاعلي للكتب والمقررات (`InteractiveReader`) مع التكبير والتصغير وتصفح الفهرس.
- [x] مساعد الذكاء الاصطناعي السياقي (`AIContextMenu`): شرح فوري، تلخيص النقاط، اختبار الفهم، ترجمة فورية، وقراءة صوتية.
- [x] نظام حفظ واسترجاع مذكرات وشروحات المذاكرة محلياً وسحابياً (`StudyNotesView`).
- [x] محرك الاختبارات الذاتية والتدريبية للدروس مع التصحيح والتعليل الفوري وحساب الدرجات (`StudyQuizzesView`).
- [x] محرر ومخصص الفهرس والصفحات للطلاب والمعلمين (`UnitsLessonsTree`).
- [x] دعم العمل بدون إنترنت والتخزين المحلي السريع (`studyStorage`).
- [x] أداء الامتحانات المدرسية المجدولة واستعراض كشوف الدرجات والشهادات.

### هـ. لوحة تحكم ولي الأمر (Parent Dashboard):
- [x] واجهة ربط الأبناء عبر كود الربط الرقمي للابن (`linkCode`).
- [x] بطاقات الأبناء لمتابعة نسبة الحضور، كشف الدرجات الأخير، وسلوك الطالب.
- [x] جدول الحصص والواجبات المدرسية لكل ابن.
- [x] قناة تواصل مباشرة مع إدارة المدرسة ومعلمي الأبناء.

### و. لوحة تحكم المشرف العام / الوزارة (Admin / Ministry Dashboard):
- [x] استعراض وإدارة المؤسسات والمدارس عبر المحافظات والمديريات.
- [x] إدارة الحسابات وتعديل الأدوار والصلاحيات.

### ز. منظومة المحادثات والتواصل (Real-Time Communication):
- [x] محادثات مباشرة فورية بين المستخدمين (Direct Messages).
- [x] غرف محادثة صفية لكل فصل دراسي (Class Chatrooms).

---

## 4. خطة العمل المتبقية وخريطة الطريق لتسليم المشروع (Manus Master Roadmap)

لتسليم المشروع لـ **Manus** أو أي وكيل ذكاء اصطناعي أو فريق برمجي لإكماله وتطويره لنسخة إنتاجية متكاملة (Enterprise-Ready Production)، تم تقسيم المهام المتبقية إلى مراحل محددة وقابلة للتنفيذ:

### المرحلة 1: تكامل التقارير وتصدير المستندات الرسمية (Export Engine & Reporting)
- [ ] **تصدير كشوفات الدرجات والشهادات بصيغة PDF**:
  - إنشاء قوالب شهادات رسمية تتضمن شعار المدرسة، اسم الطالب، تفاصيل المواد والدرجات، التقدير العام، وتوقيع الإدارة.
- [ ] **تصدير التقارير المالية والإحصائية بصيغة Excel/CSV**:
  - تصدير تقارير الرسوم المسددة والمتأخرة وكشوفات الرواتب بنقرة زر.

### المرحلة 2: الإشعارات الفورية والتنبيهات المباشرة (Push Notifications Engine)
- [ ] **ربط خدمة Firebase Cloud Messaging (FCM)**:
  - إرسال Web Push Notifications فور رصد درجات جديدة للطالب.
  - إشعار ولي الأمر الفوري عند تسجيل غياب أو تأخر الابن.
  - إشعارات الرسائل الجديدة في المحادثات الخاصة والغرف الصفية.

### المرحلة 3: بوابات الدفع الإلكتروني وسداد الرسوم (Electronic Payments Gateway)
- [ ] **واجهة سداد الرسوم المدرسية إلكترونياً**:
  - ربط بوابات دفع محلية ودولية (مثل: المحافظ الإلكترونية، Stripe، أو البطاقات الائتمانية).
  - إصدار سند قبض إلكتروني فوري معتمد برقم مرجعي تلقائي وتحديث حالة رسوم الطالب.

### المرحلة 4: محرك استرجاع وفهرسة الكتب الذكي (Cloud RAG & Vector Search Pipeline)
- [ ] **تحسين الفهرسة الدلالية للكتب الكبيرة (PDF Deep Search & Embeddings)**:
  - تقسيم صفحات الكتب واستخراج النصوص وإنشاء Embeddings لتمكين الذكاء الاصطناعي من الإجابة بدقة متناهية مع ذكر رقم الصفحة والاقتباس المباشر من النسخة الأصلية للكتاب.

### المرحلة 5: الاختبارات المحمية ومراقبة الغش (Secure Exam Proctoring)
- [ ] **نظام حماية الاختبارات المدرسية الرسمية**:
  - منع مغادرة شاشة الاختبار أو فتح تبويبات خارجية (Tab-Switch Detection).
  - مؤقت زمني دقيق لكل سؤال أو للاختبار ككل مع التسليم التلقائي عند انتهاء الوقت.
- [ ] **بنك الأسئلة الشامل وتصدير نماذج الاختبارات الورقية**:
  - إمكانية طباعة نموذج الاختبار المولد آلياً مع نموذج الإجابة للمعلم.

---

## 5. تعليمات التشغيل والانتقال للمطور / وكيل الذكاء الاصطناعي (Developer & Manus Handoff Instructions)

1. **تشغيل المشروع محلياً**:
   ```bash
   npm install
   npm run dev
   ```
2. **فحص الأنواع والتجميع**:
   ```bash
   npm run lint
   npm run build
   ```
3. **قواعد الحماية والمصادقة**:
   - تم توثيق قواعد البيانات في `firestore.rules`.
   - بيانات اعتماد فايربيس مهيأة في `firebase-applet-config.json`.
4. **المسارات والصفحات الرئيسية**:
   - `src/pages/dashboard/student/StudentCurriculums.tsx`: قارئ المناهج والمساعد الذكي.
   - `src/pages/dashboard/TeacherDashboard.tsx`: لوحة المعلم وإنشاء الاختبارات.
   - `src/pages/dashboard/PrincipalDashboard.tsx`: لوحة المدير وإدارة الكادر والفصول.
   - `src/pages/dashboard/ParentDashboard.tsx`: لوحة ولي الأمر ومتابعة الأبناء.
   - `src/pages/dashboard/AdminDashboard.tsx`: لوحة الوزارة والمشرف العام.

