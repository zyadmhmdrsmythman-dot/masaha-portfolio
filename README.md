# مساحة — معرض أعمال عربي

تطبيق MERN متجاوب باللغة العربية واتجاه RTL، ويشمل معرض المشاريع وصفحات التفاصيل ولوحة إدارة محمية وصندوق رسائل.

## المتطلبات

- Node.js 18 أو أحدث
- MongoDB محلي أو MongoDB Atlas

## التشغيل المحلي

1. ثبّت الحزم من مجلد المشروع:

   ```powershell
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. انسخ `server/.env.example` إلى `server/.env`، واضبط `MONGODB_URI` و`JWT_SECRET`.

   الخطوات التالية اختيارية فقط إذا أردت الإبقاء على حساب المدير القديم للبيانات الموجودة في الصفحة الرئيسية؛ أدخل بريده في `ADMIN_EMAIL` داخل `server/.env` أولًا:

   ```powershell
   Set-Location server
   $password = Read-Host "اختر كلمة مرور المدير" -AsSecureString
   $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
   try {
     $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
     $env:PORTFOLIO_ADMIN_PASSWORD = $plain
     $hash = node -e "import('bcryptjs').then(({default: bcrypt}) => bcrypt.hash(process.env.PORTFOLIO_ADMIN_PASSWORD, 12).then(console.log))"
     if ($LASTEXITCODE -ne 0) { throw "تعذر إنشاء تجزئة كلمة المرور." }
     $content = Get-Content .env
     $content = $content -replace '^ADMIN_PASSWORD_HASH=.*$', "ADMIN_PASSWORD_HASH=$hash"
     Set-Content -Path .env -Value $content -Encoding utf8
   } finally {
     Remove-Item Env:PORTFOLIO_ADMIN_PASSWORD -ErrorAction SilentlyContinue
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
     $plain = $null
   }
   ```

   هذا الإعداد اختياري للحفاظ على دخول المدير القديم إلى بيانات الصفحة الرئيسية. أدخل كلمة المرور التي تريدها عند ظهور المطالبة. ستُحفظ تجزئتها فقط في `ADMIN_PASSWORD_HASH`.

   يمكن لأصحاب الأعمال إنشاء حساباتهم من `/admin/register` وتسجيل الدخول فورًا دون إرسال بريد. يُستخدم البريد كاسم دخول فقط. تُعرض أعمال كل حساب على رابط عام عشوائي، ويُرسل نموذج التواصل عبر EmailJS ويحفظ نسخة في صندوق الموقع.

3. من مجلد المشروع شغّل:

   ```powershell
   npm run dev
   ```

   الواجهة متاحة على `http://localhost:5173` والـ API على `http://localhost:5000`. افتح `/admin/login` للدخول إلى لوحة الإدارة.

## النشر على Vercel

لا يستطيع Vercel الاتصال بـ MongoDB الذي يعمل على جهازك عبر `localhost`؛ هذا العنوان يشير إلى خادم Vercel نفسه. اترك MongoDB المحلي للتطوير، واستخدم MongoDB Atlas لقاعدة بيانات متاحة على الإنترنت.

1. أنشئ قاعدة MongoDB Atlas ومستخدم قاعدة بيانات، ثم أضف عنوان IP في **Network Access**. اتصالات Vercel لا تملك عنوان IP ثابتًا افتراضيًا؛ تسمح قائمة `0.0.0.0/0` باتصال Vercel من أي عنوان، لذلك استخدم كلمة مرور قوية وفريدة لمستخدم قاعدة البيانات، ولا تشارك رابط الاتصال. للقيود الشبكية الصارمة استخدم خيارًا يوفر Vercel فيه عنوان خروج ثابتًا.
2. انسخ رابط الاتصال من **Connect → Drivers**، واستبدل `<db_password>` بكلمة مرور مستخدم قاعدة البيانات بعد ترميز الأحرف الخاصة في الرابط. استخدم اسم قاعدة البيانات `portfolio`، وتأكد من تعيين رابط Atlas في `server/.env`. إذا كنت تريد الاحتفاظ بقاعدة MongoDB المحلية للتطوير، احتفظ بنسخة محلية منفصلة من رابطها.
3. أنشئ حساب ImageKit، واستخرج **Public Key** و**Private Key** و**URL Endpoint**. يحتاج النشر إلى ImageKit لأن قرص Vercel مؤقت. تُرفع الصور مباشرةً من المتصفح إلى ImageKit بتوقيع مؤقت يصدره الخادم؛ المفتاح الخاص لا يصل إلى المتصفح، كما أن الرفع المباشر يتجنب حد حجم طلبات Vercel.
4. اربط مستودع المشروع بـ Vercel، واجعل **Root Directory** هو جذر المستودع الذي يحتوي `vercel.json` وملف `package.json` الرئيسي، وليس مجلد `server` أو `client`. يعرّف `vercel.json` بانيًا للواجهة الثابتة الناتجة في `client/dist` وباني Node لدالة API في `api/[...path].js`؛ احتفظ بالجذر كما هو لتعمل إعدادات البناء معًا. من جذر المشروع اربطه باستخدام `npx vercel` واتبع خطوات الدخول والربط. إذا ظهر `404 NOT_FOUND` على الصفحة الرئيسية، تحقق من **Root Directory** ثم أعد النشر. في **Vercel → Project → Settings → Environment Variables** أضف:

   | المتغير | القيمة |
   | --- | --- |
   | `MONGODB_URI` | رابط اتصال MongoDB Atlas |
   | `ADMIN_EMAIL` | (اختياري) بريد المدير القديم |
   | `ADMIN_PASSWORD_HASH` | (اختياري) تجزئة كلمة مرور المدير القديم |
   | `JWT_SECRET` | سر عشوائي طويل مستقل عن كلمات المرور |
   | `IMAGEKIT_PUBLIC_KEY` | Public Key |
   | `IMAGEKIT_PRIVATE_KEY` | Private Key |
   | `IMAGEKIT_URL_ENDPOINT` | URL Endpoint |

   في EmailJS أنشئ Email Service وقالبًا، واجعل عنوان المستلم مضبوطًا في القالب. يستخدم نموذج التواصل في `client/src/pages/HomePage.jsx` معرّف الخدمة والقالب والمفتاح العام. تأكد أن أسماء حقول القالب هي `name` و`email` و`message`، واضبط **Reply To** على `{{email}}` للرد على المرسل. المفتاح العام مخصص للاستخدام في المتصفح؛ لا تضع **Private Key** في كود الواجهة.
5. ابدأ النشر الإنتاجي من جذر المشروع عبر `npx vercel --prod`. إعداد [vercel.json](./vercel.json) يبني واجهة React ويشغّل API كـ Vercel Function. بعد إضافة أو تغيير متغيرات البيئة، أعد النشر.

### نقل البيانات من MongoDB المحلي

استخدم MongoDB Compass للاتصال أولًا بـ `mongodb://localhost:27017/portfolio` ثم بقاعدة Atlas المحددة في `server/.env`، وانقل مجموعات `projects` و`messages`. يمكن كذلك استخدام `mongodump` و`mongorestore` من MongoDB Database Tools. الصور القديمة التي عنوانها يبدأ بـ `/uploads/` موجودة على جهازك فقط؛ أعد رفعها من لوحة الإدارة بعد النشر لتخزينها في ImageKit.

حسابات أصحاب الأعمال الجديدة وبياناتها منفصلة عن المشاريع والرسائل الحالية؛ لا تُنقل البيانات الحالية تلقائيًا. بيانات `ADMIN_EMAIL` و`ADMIN_PASSWORD_HASH` اختيارية فقط للدخول إلى بيانات البورتفوليو القديمة على الصفحة الرئيسية.

## المزايا

- عرض المشاريع بصور الغلاف، وصفحة تفاصيل منفصلة ومعرض صور إضافية وروابط خارجية اختيارية.
- إضافة المشاريع وتعديل بياناتها وصورها وحذفها من لوحة الإدارة.
- تسجيل ذاتي بالبريد وكلمة مرور مجزأة، وجلسة JWT في ملف تعريف ارتباط `HttpOnly`؛ لا يحتاج التسجيل إلى خدمة بريد.
- صفحة عامة ذات كود عشوائي لكل صاحب أعمال، مع مشاريع ورسائل منفصلة.
- نموذج التواصل يرسل الرسائل عبر EmailJS ويحفظ نسخة في MongoDB لتظهر في لوحة الحساب.
- رفع صور JPG وPNG وWebP بحد أقصى 8 ميغابايت للصورة، مع تخزين محلي أثناء التطوير أو في ImageKit عند النشر.

عند التطوير المحلي دون إعداد ImageKit تُحفظ الصور في `server/uploads`؛ هذا المجلد غير مناسب لتخزين الإنتاج على Vercel.

اسم «مساحة» وروابط التواصل نصوص افتراضية في مكونات الواجهة؛ حدّثها لتناسب حسابك قبل النشر.
