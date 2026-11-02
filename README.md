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

2. انسخ `server/.env.example` إلى `server/.env`، واكتب بريد الدخول الذي تختاره في `ADMIN_EMAIL`. لتعيين كلمة مرور دون كتابتها بشكل ظاهر، افتح PowerShell من مجلد المشروع ونفّذ:

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

   أدخل كلمة المرور التي تريدها عند ظهور المطالبة. ستُحفظ تجزئتها فقط في `ADMIN_PASSWORD_HASH`. تأكد أن `JWT_SECRET` يحتوي سرًا عشوائيًا طويلًا، وحدّث `MONGODB_URI` إذا لزم.

   الدخول إلى لوحة الإدارة مخصص لحساب واحد فقط تحدده في `ADMIN_EMAIL` و`ADMIN_PASSWORD_HASH`. لا يوجد تسجيل حسابات من الموقع، كما أن الخادم يتحقق من جلسة المدير قبل إتاحة عمليات الإدارة.

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
4. من جذر المشروع اربطه بـ Vercel باستخدام `npx vercel` واتبع خطوات الدخول والربط. في **Vercel → Project → Settings → Environment Variables** أضف:

   | المتغير | القيمة |
   | --- | --- |
   | `MONGODB_URI` | رابط اتصال MongoDB Atlas |
   | `ADMIN_EMAIL` | بريد المدير الذي اخترته |
   | `ADMIN_PASSWORD_HASH` | تجزئة كلمة مرور المدير من الخطوة المحلية أعلاه |
   | `JWT_SECRET` | سر عشوائي طويل مستقل عن كلمات المرور |
   | `IMAGEKIT_PUBLIC_KEY` | Public Key |
   | `IMAGEKIT_PRIVATE_KEY` | Private Key |
   | `IMAGEKIT_URL_ENDPOINT` | URL Endpoint |

   استخدم **Production** و**Preview** إذا رغبت في أن تعمل بيئات المعاينة أيضًا. لا تضف هذه الأسرار إلى `VITE_*` ولا تضعها في ملفات الواجهة.
5. ابدأ النشر الإنتاجي من جذر المشروع عبر `npx vercel --prod`. إعداد [vercel.json](./vercel.json) يبني واجهة React ويشغّل API كـ Vercel Function. بعد إضافة أو تغيير متغيرات البيئة، أعد النشر.

### نقل البيانات من MongoDB المحلي

استخدم MongoDB Compass للاتصال أولًا بـ `mongodb://localhost:27017/portfolio` ثم بقاعدة Atlas المحددة في `server/.env`، وانقل مجموعات `projects` و`messages`. يمكن كذلك استخدام `mongodump` و`mongorestore` من MongoDB Database Tools. الصور القديمة التي عنوانها يبدأ بـ `/uploads/` موجودة على جهازك فقط؛ أعد رفعها من لوحة الإدارة بعد النشر لتخزينها في ImageKit.

قبل تسجيل الدخول للوحة الإدارة، عيّن كلمة المرور وأنشئ `ADMIN_PASSWORD_HASH` كما هو موضح في قسم التشغيل المحلي، ثم أضف قيمة التجزئة إلى إعدادات Vercel.

## المزايا

- عرض المشاريع بصور الغلاف، وصفحة تفاصيل منفصلة ومعرض صور إضافية وروابط خارجية اختيارية.
- إضافة المشاريع وتعديل بياناتها وصورها وحذفها من لوحة الإدارة.
- دخول مدير بتجزئة كلمة مرور، وجلسة JWT محفوظة في ملف تعريف ارتباط `HttpOnly`.
- نموذج تواصل يحفظ الرسائل في MongoDB ويعرضها في لوحة الإدارة.
- رفع صور JPG وPNG وWebP بحد أقصى 8 ميغابايت للصورة، مع تخزين محلي أثناء التطوير أو في ImageKit عند النشر.

عند التطوير المحلي دون إعداد ImageKit تُحفظ الصور في `server/uploads`؛ هذا المجلد غير مناسب لتخزين الإنتاج على Vercel.

الاسم «مساحة» والبريد `hello@masaha.design` نصوص افتراضية؛ استبدلهما ببياناتك في `client/src/App.jsx` قبل النشر.
