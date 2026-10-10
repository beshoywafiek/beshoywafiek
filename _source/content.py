# -*- coding: utf-8 -*-
import icons   # الأيقونات كلها في ملف icons.py

"""
كل الكلام اللي على الموقع موجود هنا — ملف واحد بس.
عدّل اللي إنت عايزه، وبعدين شغّل:  python build.py
وهيتعمل بناء للموقع كله من جديد (٣١ صفحة).

ALL the site copy lives here, in one file. Edit, then run `python build.py`.

قاعدة واحدة: كل حاجة ليها نسختين — عربي وإنجليزي.
الأول دايماً عربي والتاني إنجليزي.
"""

# ----------------------------------------------------------------- الأساسيات
# بياناتك. غيّرها هنا وهتتغير في الموقع كله.
SITE  = 'https://beshoywafiek.github.io/beshoywafiek/'
WA    = 'https://wa.me/201273874839'          # رقم الواتساب
MAIL  = 'beshoywafiek@gmail.com'
BE    = 'https://www.behance.net/beshoywafiek1'
NAME  = ('بيشوي وفيق', 'Beshoy Wafiek')
CITY  = ('القاهرة', 'Cairo')
GA_ID = 'G-TNSYF9K2EW'                        # Google Analytics

# ----------------------------------------------------------------- الهيدر
HERO_BADGE = ('متاح لمشروعين الشهر ده', 'Two slots open this month')

# العنوان الكبير — كل سطر لوحده. <em> بتخلي الكلمة برتقالي.
HERO_AR = ['أفكارك', 'تستحق <em>تصميم</em>', 'يعبّر عنها']
HERO_EN = ['Ideas', 'deserve <em>design</em>', 'that speaks']

HERO_INTRO = (
    'بصمّم هويات بصرية ومحتوى سوشيال ميديا لبراندات في مصر والخليج '
    'والولايات المتحدة. كل مشروع نشرته، معروض هنا بالكامل.',
    'Brand identities and social content for brands across Egypt, the Gulf '
    'and the US. Every project I have published, shown here in full.')

HERO_CTA = ('شوف الشغل', 'See the work')

# ----------------------------------------------------------------- الأرقام
# الشريط المتحرك تحت العنوان. الرقم، وبعدين الكلمة بالعربي والإنجليزي.
# حطّ '+' في prefix لو عايز علامة الزيادة.
# أول رقم بيتحسب أوتوماتيك من عدد المشاريع الموجودة فعلاً على الموقع،
# علشان ما يحصلش إن الرقم يقول حاجة والموقع يقول حاجة تانية.
# حط رقم مكان None لو عايز تثبته بإيدك.
PROJECT_COUNT = None

STATS = [
    (None, '',  'مشروع منشور', 'projects'),
    (10,   '',  'وكالات',       'agencies'),
    (290,  '',  'تقدير',        'appreciations'),
    (3688, '+', 'مشاهدة',       'views'),
]

# ----------------------------------------------------------------- الأقسام
WORK_HEAD = ('مختارات', 'Selected')
WORK_NOTE = ('ستة مشاريع. الباقي في صفحة الشغل.',
             'Six projects. The rest live on the work page.')
WORK_ALL  = ('شوف كل الشغل', 'See all the work')

# الصفحة اللي فيها كل المشاريع
ALL_HEAD = ('كل الشغل', 'All work')
ALL_NOTE = ('كل مشروع ليه صفحة لوحده، بالمقاس اللي الشغل اتعمل بيه.',
            'Every project has a page of its own, at the size the work was made.')

# الشريط البرتقالي العريض
BAND_KICKER = ('طريقة الشغل', 'How it works')
BAND_LINE = ('كل مشروع بيبدأ بفهم البراند، وبينتهي بنظام بصري متماسك.',
             'Every project starts with the brand, and ends with a visual '
             'system that holds.')

# ----------------------------------------------------------------- عني
ABOUT_HEAD = ('عني', 'About')
ABOUT_LEAD = ('مصمم جرافيك من القاهرة، بشتغل على الهويات البصرية ومحتوى '
              'السوشيال ميديا.',
              'A graphic designer in Cairo, working on brand identities and '
              'social media content.')
ABOUT_BODY = (
    'من ٢٠٢١ وأنا بصمم لبراندات في مصر والخليج والولايات المتحدة — مطاعم، '
    'عقارات، أكاديميات رياضية، وشركات لسه في أول طريقها. الشغل كله هنا، '
    'مش عينات مختارة.',
    'Since 2021 I have been designing for brands in Egypt, the Gulf and the '
    'US — restaurants, real estate, sports academies and companies still '
    'finding their feet. All of the work is here, not a curated handful.')

# الجدول الصغير جنب الصورة
ABOUT_FACTS = [
    ('التخصص', 'Focus',     'هوية بصرية · سوشيال ميديا', 'Brand identity · Social'),
    ('الأسواق', 'Markets',   'مصر · الخليج · أمريكا',      'Egypt · Gulf · US'),
    ('الرد',    'Replies',   'عادةً خلال ساعتين',          'Usually within 2 hours'),
    ('اللغات',  'Languages', 'عربي · إنجليزي',             'Arabic · English'),
]

# ----------------------------------------------------------------- الخدمات
# الرقم، الاسم عربي، الاسم إنجليزي، الوصف عربي، الوصف إنجليزي،
# السعر، المدة عربي، المدة إنجليزي، الأيقونة (SVG)
SERVICES_HEAD = ('الخدمات', 'Services')
SERVICES_NOTE = ('أسعار البداية. كل مشروع بيتسعّر على حسب حجمه.',
                 'Starting prices. Every project is quoted to its own scope.')
SERVICES = [
    ('01', 'تصميم لوجو', 'Logo Design',
     'لوجو واضح ومميز، مع كل الملفات النهائية الجاهزة للطباعة والديجيتال.',
     'A clear, distinctive mark, with every final file ready for print and screen.',
     '$180+', 'من 5 أيام', 'from 5 days',
     icons.LOGO),
    ('02', 'هوية بصرية متكاملة', 'Brand Identity',
     'لوجو وألوان وخطوط ودليل هوية — نظام واحد يشتغل في كل مكان.',
     'Logo, colour, type and guidelines — one system that holds everywhere.',
     '$300+', 'من 10 أيام', 'from 10 days',
     icons.IDENTITY),
    ('03', 'سوشيال ميديا', 'Social Media',
     'تصميمات متناسقة عبر كل المنصات، محافظة على شكل البراند وبتتنشر على طول.',
     'Consistent designs across every platform, on-brand and ready to post.',
     '$80+', 'شهرياً', 'per month',
     icons.SOCIAL),
]

# ----------------------------------------------------------------- اللي بتاخده
DELIVER_HEAD = ('اللي بتاخده', 'What you get')
DELIVER_NOTE = ('مش ملفات متفرقة — نظام تقدر تشتغل بيه.',
                'Not loose files — a system you can work with.')
DELIVER = [
    ('اللوجو', 'The logo', 'بكل الصيغ الجاهزة للاستخدام', 'In every format, ready to use',
     icons.D_LOGO),
    ('الألوان', 'The palette', 'نظام لون متماسك وأكواده', 'A coherent colour system with codes',
     icons.D_PALETTE),
    ('الخطوط', 'The type', 'خطوط مختارة ومقاساتها', 'Chosen typefaces and their scale',
     icons.D_TYPE),
    ('دليل الهوية', 'The guidelines', 'إزاي تتطبق في أي مكان', 'How it all applies, anywhere',
     icons.D_GUIDE),
]

# ----------------------------------------------------------------- تواصل
CONTACT_AR = 'يلا نصمم حاجة<br><em>تفضل في الدماغ.</em>'
CONTACT_EN = 'Let’s make something<br><em>worth remembering.</em>'
CONTACT_BTN = ('كلمني على واتساب', 'Message me on WhatsApp')
PICK_LABEL = ('جاوب ٣ أسئلة والرسالة تتكتب لوحدها',
              'Answer three questions and the message writes itself')

# الأسئلة اللي بتسهّل على العميل. كل سؤال: العنوان عربي/إنجليزي،
# وبعدين الاختيارات. أول حاجة في كل اختيار هي اللي بتتكتب في الرسالة.
# تقدر تزود أو تشيل سؤال أو اختيار براحتك.
ASK = [
    ('محتاج إيه؟', 'What do you need?', [
        ('لوجو', 'a logo'),
        ('هوية بصرية متكاملة', 'a full brand identity'),
        ('تصميم سوشيال ميديا', 'social media design'),
        ('ويبسايت', 'a website'),
        ('لسه مش متأكد', 'not sure yet'),
    ]),
    ('البراند في أنهي مرحلة؟', 'Where is the brand?', [
        ('لسه من الصفر', 'starting from scratch'),
        ('موجود ومحتاج تطوير', 'exists and needs a refresh'),
        ('شغال وعايز محتوى', 'running, needs content'),
    ]),
    ('عايزه امتى؟', 'When do you need it?', [
        ('في أقرب وقت', 'as soon as possible'),
        ('خلال شهر', 'within a month'),
        ('لسه بخطط', 'still planning'),
    ]),
]

# الرسالة اللي بتتبعت. {1} {2} {3} بتتبدل بإجابات الأسئلة.
ASK_MSG = ('أهلاً بيشوي، شفت شغلك. محتاج {1}، البراند {2}، وعايزه {3}. ممكن نتكلم؟',
           'Hi Beshoy, I saw your work. I need {1}, the brand is {2}, and I need it {3}. Can we talk?')
ASK_MSG_EMPTY = ('أهلاً بيشوي، شفت شغلك وحابب نتكلم.',
                 'Hi Beshoy, I saw your work and would like to talk.')
ASK_ANY = ('لسه مش محدد', 'not decided yet')
ASK_PREVIEW = ('الرسالة اللي هتتبعت', 'The message that gets sent')

# آخر الصفحة في كل مشروع
CASE_CTA_AR = 'عندك مشروع<br>زي ده؟'
CASE_CTA_EN = 'Got a project<br>like this?'

# ----------------------------------------------------------------- التصنيفات
# التصنيفات اللي بتفلتر بيها صفحة الشغل.
# المفتاح (social / identity …) هو اللي مكتوب جنب كل مشروع في meta.py
CATS = {
    'social':   ('سوشيال ميديا', 'Social Media'),
    'identity': ('هوية بصرية', 'Brand Identity'),
    'logo':     ('لوجو', 'Logo'),
    'art':      ('آرت ديركشن', 'Art Direction'),
}

# ----------------------------------------------------------------- المنيو
# (اللينك، بالعربي، بالإنجليزي، المفتاح علشان يعرف انت فين)
NAV = [
    ('{R}work.html', 'الشغل', 'Work', 'work'),
    ('{R}index.html#services', 'الخدمات', 'Services', ''),
    ('{R}index.html#about', 'عني', 'About', ''),
    ('{R}index.html#contact', 'تواصل', 'Contact', ''),
]

# ----------------------------------------------------------------- SEO
TITLE_HOME = 'بيشوي وفيق — مصمم هوية بصرية وجرافيك | Beshoy Wafiek — Brand Identity Designer, Cairo'
# {n} و {an} بيتبدلوا أوتوماتيك بعدد المشاريع الحقيقي (بالإنجليزي وبالعربي).
# كانوا مكتوبين بالإيد "27" وفضلوا كده بعد ما شلنا مشروعين — يعني جوجل
# وواتساب كانوا بيقولوا رقم والموقع فيه رقم تاني.
DESC_HOME  = ('تصميم هوية بصرية ولوجو وسوشيال ميديا لبراندات في مصر والخليج وأمريكا. '
              'Brand identity, logo and social media design for brands in Egypt, '
              'the Gulf and the US. {n} published projects.')
TITLE_WORK = 'كل الشغل — بيشوي وفيق | Portfolio — Beshoy Wafiek, Brand Designer'
DESC_WORK  = ('{an} مشروع منشور: هوية بصرية ولوجو وسوشيال ميديا. '
              '{n} published projects: brand identity, logos and social media design.')


# ===================================================================
# السوشيال — الزرار العايم تحت
# ===================================================================
# سيب أي واحد فاضي ('') وهو مش هيظهر خالص.
# WhatsApp و Behance شغالين. املا انستجرام وفيسبوك بلينكاتك.
IG = 'https://instagram.com/beshoy_wafiek'
FB = 'https://www.facebook.com/beshoy.wafiek/'
LI = 'https://www.linkedin.com/in/beshoy-wafiek-0010b9316'

SOCIAL = [
    ('whatsapp',  'واتساب',   'WhatsApp',  WA),
    ('instagram', 'انستجرام', 'Instagram', IG),
    ('behance',   'بيهانس',   'Behance',   BE),
    ('linkedin',  'لينكد إن', 'LinkedIn',  LI),
    ('facebook',  'فيسبوك',   'Facebook',  FB),
    ('email',     'إيميل',    'Email',     'mailto:' + MAIL),
]

# ===================================================================
# العرض اللي بيظهر في البوب أب
# ===================================================================
# خليه OFFER_ON = False لو عايز توقفه.
OFFER_ON    = True
OFFER_KICK  = ('عرض أول تعامل', 'First project offer')
OFFER_TITLE = ('خصم ٣٠٪', '30% off')
OFFER_BODY  = ('على كل الخدمات لأول تعامل. الهوية والسوشيال واللوجو.',
               'On every service, for your first project — identity, social and logo.')
OFFER_CTA   = ('اعرف أكتر', 'Tell me more')
OFFER_SKIP  = ('مش دلوقتي', 'Not now')
# الرسالة اللي بتتبعت لو داس على الزرار
OFFER_MSG   = ('أهلاً بيشوي، شفت عرض خصم ٣٠٪ لأول تعامل وحابب أعرف تفاصيله.',
               'Hi Beshoy, I saw the 30% first-project offer and would like to know more.')
OFFER_DELAY = 3          # بعد كام ثانية يظهر
# لو قفله وقال "مش دلوقتي" — يرجع تاني بعد كام يوم.
# ده الشخص اللي لسه بيفكر، فمنطقي يشوف العرض تاني لما يرجع.
OFFER_DAYS  = 3
# لو داس على الزرار وكلمك فعلاً — ميظهرش تاني قبل كام يوم.
# ده خلاص اتواصل معاك، ولو العرض فضل يطلعله هيبان إلحاح.
OFFER_DAYS_ACTED = 60

# ===================================================================
# فورم تسجيل البيانات
# ===================================================================
# ده لينك الـ Google Apps Script اللي بيحفظ البيانات في جوجل شيت.
# سيبه فاضي ('') والفورم هيشتغل على الواتساب عادي.
# خطوات تعمله في آخر HOW-TO-EDIT.md
FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwmGomTeGuQk9beoap_xhOiXf2su2xH_JC_cS_I-yfWBuomAx3IVPXU_SlZpWCif1JhnA/exec'

FORM_TITLE  = ('سيب بياناتك وأنا أكلمك', 'Leave your details and I will reach out')
FORM_NOTE   = ('أو كلمني على واتساب على طول.', 'Or message me on WhatsApp right away.')
FORM_FIELDS = [
    ('name',  'الاسم',         'Name',            'text',  True),
    ('phone', 'رقم الواتساب',  'WhatsApp number', 'tel',   True),
    ('email', 'الإيميل (اختياري)', 'Email (optional)', 'email', False),
]
FORM_SEND   = ('ابعت', 'Send')
FORM_SENDING= ('بيتبعت…', 'Sending…')
FORM_OK     = ('وصلتني. هكلمك خلال ساعتين.', 'Got it. I will be in touch within two hours.')
FORM_ERR    = ('في مشكلة. كلمني على واتساب بدل ما تستنى.',
               'Something went wrong. Message me on WhatsApp instead.')


# ===================================================================
# صفحات الخدمات
# ===================================================================
# كل خدمة ليها صفحة كاملة زي صفحات المشاريع.
# المفتاح لازم يطابق الرقم في SERVICES فوق ('01' / '02' / '03').
#   slug    = اسم الصفحة في اللينك
#   ask     = رقم الاختيار في السؤال الأول (0 = أول اختيار)
#   cat     = تصنيف المشاريع اللي هتظهر تحت
#   inc     = اللي بياخده العميل
SERVICE_PAGES = {
    '01': dict(slug='logo-design', short=('لوجو واضح ومميز','A clear, distinctive mark'), ask=0, cat='logo', inc=[
        ('٣ اتجاهات مختلفة للوجو', 'Three different directions'),
        ('تعديلات غير محدودة على الاتجاه اللي تختاره', 'Unlimited revisions on the one you pick'),
        ('كل الملفات: AI و EPS و SVG و PNG و PDF', 'Every file: AI, EPS, SVG, PNG, PDF'),
        ('نسخ أفقي ورأسي وأيقونة', 'Horizontal, vertical and icon versions'),
        ('نسخة أبيض وأسود', 'A one-colour version'),
        ('ملف بقواعد الاستخدام', 'A sheet of usage rules'),
    ]),
    '02': dict(slug='brand-identity', short=('نظام هوية كامل','A full identity system'), ask=1, cat='identity', inc=[
        ('اللوجو بكل نسخه وملفاته', 'The logo, every version and format'),
        ('نظام ألوان كامل بأكواده', 'A full colour system with codes'),
        ('الخطوط ومقاساتها للعربي والإنجليزي', 'Typefaces and scale, Arabic and Latin'),
        ('عناصر بصرية وباترنز', 'Visual elements and patterns'),
        ('تطبيقات: كارت وبروشور وسوشيال', 'Applications: cards, print, social'),
        ('دليل هوية PDF كامل', 'A complete brand book as PDF'),
    ]),
    '03': dict(slug='social-media', short=('محتوى متناسق كل شهر','A consistent set each month'), ask=2, cat='social', inc=[
        ('تصميمات شهرية متناسقة', 'A consistent set each month'),
        ('مقاسات كل المنصات', 'Sized for every platform'),
        ('قوالب تقدر تستخدمها بنفسك', 'Templates you can reuse yourself'),
        ('كتابة المحتوى لو محتاج', 'Copywriting if you need it'),
        ('تعديلين على كل تصميم', 'Two revisions per design'),
        ('تسليم أسبوعي أو شهري', 'Weekly or monthly delivery'),
    ]),
}

# خطوات الشغل — بتظهر في كل صفحة خدمة
PROCESS = [
    ('الفهم', 'Discovery',
     'نتكلم عن البراند والجمهور والمنافسين، وأشوف إيه اللي ناقص.',
     'We talk through the brand, the audience and the competition, and I find what is missing.'),
    ('الاتجاه', 'Direction',
     'أجهّز اتجاه بصري واضح قبل ما أبدأ أصمم، علشان نتفق على الشكل من الأول.',
     'I set a clear visual direction before designing, so we agree on the look up front.'),
    ('التصميم', 'Design',
     'أشتغل على الاتجاه اللي اتفقنا عليه، وأبعتلك أول نسخة للمراجعة.',
     'I work the agreed direction up and send you the first version to review.'),
    ('التسليم', 'Delivery',
     'تعديلات لحد ما تبقى مظبوطة، وبعدين كل الملفات جاهزة للاستخدام.',
     'Revisions until it is right, then every file ready to use.'),
]

SVC_INC_HEAD  = ('اللي بتاخده', 'What you get')
SVC_HOW_HEAD  = ('خطوات الشغل', 'How we work')
SVC_WORK_HEAD = ('شغل من النوع ده', 'Work of this kind')
SVC_CTA       = ('ابدأ المشروع', 'Start the project')
SVC_ALL       = ('كل الخدمات', 'All services')


# ===================================================================
# SEO — الظهور في جوجل ومساعدات الـ AI
# ===================================================================
# العناوين بالعربي والإنجليزي مع بعض عن قصد: الصفحة لها لينك واحد
# وعنوان واحد، فلازم العنوان يحتوي الكلمتين علشان يظهر في البحثين.

SEO_NAME_AR = 'بيشوي وفيق'
SEO_JOB_AR  = 'مصمم جرافيك وهوية بصرية'
SEO_JOB_EN  = 'Brand Identity & Graphic Designer'

# الحسابات التانية — دي بتربط هويتك عبر الإنترنت وبتقوي ظهورك.
# كل ما تزود حساب حقيقي هنا كل ما بقيت أوضح لمحركات البحث.
# كل حساب حقيقي هنا بيربط هويتك عبر الإنترنت ويخلي محركات البحث
# ومساعدات الـ AI متأكدة إن ده نفس الشخص.
SEO_PROFILES = [
    BE,                                        # الحساب الأساسي
    'https://www.behance.net/beshoywafiek',     # الحساب التاني
    IG,
    FB,
    LI,
]

SEO_SKILLS = [
    'تصميم هوية بصرية', 'تصميم لوجو', 'تصميم سوشيال ميديا',
    'براند جايدلاينز', 'آرت ديركشن', 'تصميم جرافيك',
    'Brand identity design', 'Logo design', 'Social media design',
    'Brand guidelines', 'Art direction', 'Arabic typography',
]
SEO_AREAS = ['Egypt', 'Saudi Arabia', 'United Arab Emirates',
             'Kuwait', 'Qatar', 'United States']
SEO_CITY     = 'Cairo'
SEO_COUNTRY  = 'EG'
SEO_PRICE    = '$$'
SEO_FOUNDED  = '2021'

# ===================================================================
# آراء العملاء
# ===================================================================
# الموقع بيقول "١٠ وكالات" من غير ما يقول مين — وده أضعف نوع من الإثبات.
# سطرين من عميل باسمه أقوى من أي كلام تاني في الصفحة كلها.
#
# كل رأي: (النص بالعربي، النص بالإنجليزي، الاسم، الدور أو الشركة)
# سيب القايمة فاضية [] والقسم كله مش هيظهر خالص — مفيش مكان فاضي
# ولا كلام مكتوب على الفاضي.
PROOF_HEAD = ('اللي العملاء بيقولوه', 'What clients say')
PROOF_NOTE = ('كلام ناس اشتغلت معاهم فعلاً.', 'From people I actually worked with.')
PROOF = [
    # مثال — امسح الهاشتاج واكتب مكانه رأي حقيقي:
    # ('بيشوي فهم البراند من أول اجتماع وطلّع هوية احنا فخورين بيها.',
    #  'Beshoy understood the brand from the first meeting and delivered an identity we are proud of.',
    #  'اسم العميل', 'المدير التنفيذي، اسم الشركة'),
]

# ===================================================================
# الأسئلة الشائعة
# ===================================================================
# دي أهم حاجة للظهور في ChatGPT وجوجل: سؤال واضح وإجابة كاملة
# لوحدها. اكتبها بالظبط زي ما العميل هيسأل.
FAQ_HEAD = ('أسئلة بتتسأل كتير', 'Questions I get a lot')
FAQ = [
    ('تصميم اللوجو بكام؟', 'How much does a logo cost?',
     'تصميم اللوجو بيبدأ من ١٨٠ دولار، وبيشمل ٣ اتجاهات مختلفة، وتعديلات '
     'غير محدودة على الاتجاه اللي تختاره، وكل الملفات النهائية بصيغ '
     'AI و EPS و SVG و PNG و PDF. الهوية البصرية المتكاملة بتبدأ من ٣٠٠ دولار.',
     'A logo starts at $180 and includes three different directions, unlimited '
     'revisions on the one you pick, and every final file in AI, EPS, SVG, PNG '
     'and PDF. A full brand identity starts at $300.'),

    ('المشروع بياخد وقت قد إيه؟', 'How long does a project take?',
     'تصميم اللوجو بياخد من ٥ أيام. الهوية البصرية المتكاملة من ١٠ أيام. '
     'تصميمات السوشيال ميديا بتتسلم أسبوعي أو شهري حسب الاتفاق. '
     'المدة بتبدأ من أول ما نتفق على الاتجاه البصري.',
     'A logo takes from five days. A full brand identity from ten days. Social '
     'media design is delivered weekly or monthly. The clock starts once we '
     'agree on the visual direction.'),

    ('بتشتغل مع عملاء بره مصر؟', 'Do you work with clients outside Egypt?',
     'أيوة. بشتغل مع عملاء في مصر والسعودية والإمارات والكويت وقطر '
     'والولايات المتحدة. التواصل بيكون بالعربي أو الإنجليزي، والتسليم '
     'أونلاين، والدفع بالتحويل البنكي أو PayPal أو Wise.',
     'Yes. I work with clients in Egypt, Saudi Arabia, the UAE, Kuwait, Qatar '
     'and the United States. We can work in Arabic or English, delivery is '
     'online, and payment can be bank transfer, PayPal or Wise.'),

    ('بتسلم إيه بالظبط؟', 'What exactly do I receive?',
     'بتستلم اللوجو بكل نسخه (أفقي ورأسي وأيقونة وأبيض وأسود) بصيغ '
     'الفيكتور والصور، ونظام ألوان بأكواده، والخطوط ومقاساتها، ودليل هوية '
     'PDF فيه قواعد الاستخدام. الملفات كلها ملكك بالكامل.',
     'You receive the logo in every version (horizontal, vertical, icon and '
     'one-colour) in both vector and raster formats, a colour system with '
     'codes, the typefaces and their scale, and a PDF brand book with the '
     'usage rules. All files are yours outright.'),

    ('بتصمم بالعربي ولا الإنجليزي؟', 'Do you design in Arabic or English?',
     'الاتنين. بصمم هويات ثنائية اللغة، وبختار الخطوط العربية والإنجليزية '
     'اللي تشتغل مع بعض، علشان البراند يبقى متماسك في اللغتين — ده مهم '
     'جداً لأي براند شغال في السوق العربي.',
     'Both. I build bilingual identities and pick Arabic and Latin typefaces '
     'that work together, so the brand holds in either language — which '
     'matters for any brand operating in the Arab market.'),

    ('لو مش عاجبني التصميم؟', 'What if I do not like the design?',
     'بنتفق على الاتجاه البصري قبل ما أبدأ أصمم، علشان مايحصلش ده. وبعد '
     'كده التعديلات مستمرة لحد ما يظبط. لو لسه مش مظبوط بعد الاتجاه '
     'الأول، بنرجع نشتغل على اتجاه تاني من غير تكلفة إضافية.',
     'We agree the visual direction before I start designing, so this rarely '
     'happens. After that, revisions continue until it is right. If the first '
     'direction still is not working, we start a second one at no extra cost.'),
]

# ===================================================================
# صفحة اللينك الغلط (404)
# ===================================================================
# من غيرها، أي لينك قديم أو غلطة في الكتابة بتوري صفحة GitHub الرمادية
# اللي مالهاش علاقة بيك. دي بتوري شغلك وبترجّع الواحد للموقع.
NF_HEAD  = ('الصفحة دي مش موجودة', 'This page does not exist')
NF_BODY  = ('يمكن اللينك قديم أو فيه حرف ناقص. الشغل كله لسه مكانه.',
            'The link may be old or missing a character. All the work is still here.')
NF_WORK  = ('شوف الشغل', 'See the work')
NF_HOME  = ('الصفحة الرئيسية', 'Home')
