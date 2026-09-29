import type { Locale } from '@doulisha/i18n';

/**
 * Draft Privacy, Terms and data deletion texts (ADR 0019). Written from what
 * the app really stores and does; not legal advice. To be checked against
 * Tunisian personal-data law (organic law 2004-63) before a public launch.
 * Operator and contact decided by the founder on 2026-09-29.
 */
export const LEGAL_CONTACT = 'bouhelii.hedi@gmail.com';
export const LEGAL_UPDATED = new Date('2026-09-29T00:00:00+01:00');

export type LegalKind = 'privacy' | 'terms' | 'dataDeletion';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  intro: string;
  sections: LegalSection[];
}

const fr: Record<LegalKind, LegalDocument> = {
  privacy: {
    intro:
      'Doulisha est une plateforme pour découvrir, organiser et réserver des événements et activités en Tunisie. Cette page explique quelles données Doulisha enregistre, pourquoi, et comment vous gardez la main dessus.',
    sections: [
      {
        heading: 'Qui est responsable de vos données',
        paragraphs: [
          `Le service est Doulisha, un projet en cours de développement. Pour toute question sur vos données : ${LEGAL_CONTACT}.`,
        ],
      },
      {
        heading: 'Ce que nous enregistrons',
        items: [
          'Votre compte : nom, numéro de téléphone et/ou adresse e-mail, ville, mot de passe (enregistré chiffré, jamais en clair).',
          'Si vous vous connectez avec Google ou Facebook : votre nom, votre adresse e-mail (si le service la fournit), votre photo de profil et l’identifiant de votre compte chez ce service. Nous ne lisons ni vos amis, ni vos publications, et nous ne publions rien en votre nom.',
          'Vos réservations : les noms, téléphones et e-mails des participants que vous indiquez, les réponses aux questions de l’organisateur, le point de rendez-vous choisi, les billets et leurs QR codes, les entrées validées à l’accueil.',
          'Les paiements : le moyen de paiement choisi, les montants, les reçus D17 ou de virement que vous envoyez, et les décisions de l’organisateur (paiement confirmé ou reçu refusé).',
          'Les organisateurs : les informations de leur profil public (nom, présentation, photos, liens vers leurs réseaux, contacts) et les coordonnées de paiement qu’ils choisissent de montrer aux acheteurs (numéro D17, RIB).',
          'Les invitations privées : la liste des invités et leurs réponses.',
          'Le lien par lequel vous êtes arrivé sur un événement (par exemple « partagé sur WhatsApp »), pour que l’organisateur sache quels partages fonctionnent.',
        ],
      },
      {
        heading: 'Pourquoi',
        items: [
          'Vous connecter et protéger votre compte (codes par SMS ou e-mail, mot de passe, Google, Facebook).',
          'Réserver des places, émettre les billets et permettre à l’organisateur de gérer son événement (liste des participants, paiements, accueil).',
          'Vous envoyer les messages liés à vos réservations : codes, confirmation de paiement, reçu refusé, réservation annulée, rappels.',
          'Afficher les profils publics des organisateurs et les événements publics.',
        ],
        paragraphs: ['Doulisha n’affiche pas de publicité et ne vend pas vos données.'],
      },
      {
        heading: 'Qui voit quoi',
        items: [
          'L’organisateur d’un événement voit les informations des participants de cet événement : noms, contacts, réponses, paiements et reçus.',
          'Les événements privés ne sont jamais listés ni indexés par les moteurs de recherche ; leur liste d’invités n’est visible que par les hôtes et les invités.',
          'Le profil public d’un organisateur est visible par tous.',
        ],
      },
      {
        heading: 'Prestataires techniques',
        paragraphs: [
          'Pour fonctionner, Doulisha utilise des prestataires qui traitent des données pour son compte : Neon (base de données), Vercel (hébergement du site), Google et Meta (Facebook) uniquement pour la connexion si vous la choisissez. Certains de ces serveurs se trouvent hors de Tunisie, notamment aux États-Unis. Des services d’envoi de SMS, d’e-mails et de stockage de fichiers seront ajoutés avant le lancement public ; cette page sera mise à jour.',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'Doulisha utilise uniquement les cookies nécessaires : garder votre session ouverte, retenir votre langue et permettre de réserver sans compte (session invitée). Aucun cookie publicitaire ni de suivi.',
        ],
      },
      {
        heading: 'Combien de temps',
        paragraphs: [
          'Vos données de compte sont gardées tant que votre compte existe. Les traces des réservations et des paiements peuvent être gardées plus longtemps lorsque c’est nécessaire pour les organisateurs et la comptabilité, puis supprimées.',
        ],
      },
      {
        heading: 'Vos droits',
        paragraphs: [
          `Vous pouvez demander à consulter, corriger ou supprimer vos données en écrivant à ${LEGAL_CONTACT}. Vous pouvez aussi retirer Google ou Facebook de votre compte à tout moment depuis « Mon compte ». Pour supprimer votre compte, voir la page « Suppression des données ».`,
        ],
      },
      {
        heading: 'Modifications',
        paragraphs: [
          'Cette politique peut évoluer avec le service. La date de mise à jour figure en haut de la page.',
        ],
      },
    ],
  },
  terms: {
    intro:
      'Ces conditions s’appliquent à toute personne qui utilise Doulisha : participants, invités, hôtes d’invitations privées et organisateurs.',
    sections: [
      {
        heading: 'Le service',
        paragraphs: [
          'Doulisha permet de découvrir des événements et activités, de réserver des places, de créer des événements et d’envoyer des invitations privées. Doulisha est un projet en cours de développement : des fonctions peuvent changer, être interrompues ou comporter des erreurs.',
        ],
      },
      {
        heading: 'Votre compte',
        items: [
          'Donnez des informations exactes et gardez votre mot de passe et vos codes pour vous.',
          'Vous êtes responsable de ce qui est fait depuis votre compte.',
          'Vous pouvez vous connecter par code (SMS ou e-mail), par mot de passe, ou avec Google ou Facebook.',
        ],
      },
      {
        heading: 'Organisateurs',
        items: [
          'L’organisateur est seul responsable de son événement : exactitude des informations, sécurité, autorisations, déroulement et remboursements selon la politique d’annulation affichée sur l’événement.',
          'Les paiements par D17, virement ou espèces sont versés directement à l’organisateur. Doulisha ne reçoit pas et ne garde pas cet argent.',
          'L’organisateur n’utilise les données des participants que pour son événement.',
        ],
      },
      {
        heading: 'Participants',
        items: [
          'Une réservation est confirmée quand le billet affiche son QR code. Pour D17 et le virement, cela arrive quand l’organisateur a confirmé le paiement.',
          'Respectez les règles de l’organisateur et les consignes de sécurité.',
          'Les annulations et remboursements suivent la politique affichée sur l’événement.',
        ],
      },
      {
        heading: 'Contenus',
        paragraphs: [
          'Vous restez propriétaire de ce que vous publiez (textes, photos). Vous autorisez Doulisha à l’afficher pour faire fonctionner le service. Les contenus illégaux, trompeurs, haineux ou qui portent atteinte à autrui sont interdits et peuvent être retirés, et le compte suspendu.',
        ],
      },
      {
        heading: 'Responsabilité',
        paragraphs: [
          'Doulisha met en relation participants et organisateurs mais n’organise pas les événements. Dans la limite permise par la loi, Doulisha n’est pas responsable du déroulement d’un événement ni des échanges d’argent entre participants et organisateurs.',
        ],
      },
      {
        heading: 'Droit applicable et contact',
        paragraphs: [
          `Ces conditions sont régies par le droit tunisien. Pour toute question : ${LEGAL_CONTACT}. Elles peuvent évoluer ; la date de mise à jour figure en haut de la page.`,
        ],
      },
    ],
  },
  dataDeletion: {
    intro:
      'Vous pouvez à tout moment demander la suppression de votre compte Doulisha et de vos données.',
    sections: [
      {
        heading: 'Demander la suppression',
        items: [
          `Écrivez à ${LEGAL_CONTACT} avec pour objet « Suppression de compte ».`,
          'Envoyez-le depuis l’adresse e-mail de votre compte, ou indiquez le numéro de téléphone de votre compte, pour que nous puissions vérifier qu’il s’agit bien de vous.',
          'Nous supprimons le compte dans un délai de 30 jours et vous le confirmons par écrit.',
        ],
      },
      {
        heading: 'Ce qui est supprimé',
        items: [
          'Votre compte, votre profil et votre photo.',
          'Les connexions Google ou Facebook liées à votre compte.',
          'Votre profil organisateur et ses photos, si vous en avez un.',
        ],
      },
      {
        heading: 'Ce qui peut être gardé',
        paragraphs: [
          'Les traces des réservations et paiements déjà effectués peuvent être gardées lorsque c’est nécessaire pour les organisateurs et la comptabilité, sans être liées à un compte actif, puis supprimées.',
        ],
      },
      {
        heading: 'Retirer Doulisha de Google ou Facebook',
        items: [
          'Depuis Doulisha : « Mon compte » → « Moyens de connexion » → « Retirer ».',
          'Depuis Facebook : Paramètres → Applications et sites web → Doulisha → Retirer.',
          'Depuis Google : myaccount.google.com → Sécurité → Applications tierces connectées → Doulisha → Supprimer l’accès.',
        ],
      },
    ],
  },
};

const en: Record<LegalKind, LegalDocument> = {
  privacy: {
    intro:
      'Doulisha is a platform to discover, organize and book events and activities in Tunisia. This page explains what data Doulisha stores, why, and how you stay in control.',
    sections: [
      {
        heading: 'Who is responsible for your data',
        paragraphs: [
          `The service is Doulisha, a project in development. For any question about your data: ${LEGAL_CONTACT}.`,
        ],
      },
      {
        heading: 'What we store',
        items: [
          'Your account: name, phone number and/or email address, city, password (stored hashed, never in plain text).',
          'If you sign in with Google or Facebook: your name, your email address (if the service provides it), your profile photo and your account ID at that service. We do not read your friends or your posts, and we never post on your behalf.',
          'Your bookings: the names, phones and emails of the attendees you enter, answers to the organizer’s questions, the chosen meeting point, tickets and their QR codes, and check-ins at the door.',
          'Payments: the payment method chosen, amounts, the D17 or transfer receipts you send, and the organizer’s decisions (payment confirmed or receipt refused).',
          'Organizers: their public profile (name, description, photos, social links, contacts) and the payment details they choose to show buyers (D17 number, RIB).',
          'Private invitations: the guest list and the answers.',
          'The link that brought you to an event (for example “shared on WhatsApp”), so the organizer knows which shares work.',
        ],
      },
      {
        heading: 'Why',
        items: [
          'To sign you in and protect your account (SMS or email codes, password, Google, Facebook).',
          'To book places, issue tickets and let the organizer run the event (attendee list, payments, check-in).',
          'To send you messages about your bookings: codes, payment confirmation, receipt refused, reservation cancelled, reminders.',
          'To show organizers’ public profiles and public events.',
        ],
        paragraphs: ['Doulisha shows no advertising and does not sell your data.'],
      },
      {
        heading: 'Who sees what',
        items: [
          'The organizer of an event sees the details of that event’s attendees: names, contacts, answers, payments and receipts.',
          'Private events are never listed or indexed by search engines; their guest list is visible only to hosts and guests.',
          'An organizer’s public profile is visible to everyone.',
        ],
      },
      {
        heading: 'Technical providers',
        paragraphs: [
          'To run, Doulisha uses providers that process data on its behalf: Neon (database), Vercel (website hosting), and Google and Meta (Facebook) only for sign-in if you choose it. Some of these servers are outside Tunisia, notably in the United States. SMS, email and file storage services will be added before the public launch; this page will be updated.',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'Doulisha uses only necessary cookies: keeping you signed in, remembering your language and letting you book without an account (guest session). No advertising or tracking cookies.',
        ],
      },
      {
        heading: 'How long',
        paragraphs: [
          'Account data is kept while your account exists. Records of bookings and payments may be kept longer when organizers and accounting need them, then deleted.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          `You can ask to see, correct or delete your data by writing to ${LEGAL_CONTACT}. You can also remove Google or Facebook from your account at any time in “My account”. To delete your account, see the “Data deletion” page.`,
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'This policy may change with the service. The date of the last update is at the top of the page.',
        ],
      },
    ],
  },
  terms: {
    intro:
      'These terms apply to everyone who uses Doulisha: participants, guests, hosts of private invitations and organizers.',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'Doulisha lets you discover events and activities, book places, create events and send private invitations. Doulisha is a project in development: features may change, stop or contain errors.',
        ],
      },
      {
        heading: 'Your account',
        items: [
          'Give accurate information and keep your password and codes to yourself.',
          'You are responsible for what is done from your account.',
          'You can sign in with a code (SMS or email), a password, or with Google or Facebook.',
        ],
      },
      {
        heading: 'Organizers',
        items: [
          'The organizer alone is responsible for their event: accurate information, safety, permits, how it runs, and refunds under the cancellation policy shown on the event.',
          'Payments by D17, transfer or cash go directly to the organizer. Doulisha does not receive or hold that money.',
          'Organizers use attendees’ data only for their event.',
        ],
      },
      {
        heading: 'Participants',
        items: [
          'A booking is confirmed when the ticket shows its QR code. For D17 and transfers, that happens once the organizer has confirmed the payment.',
          'Follow the organizer’s rules and the safety instructions.',
          'Cancellations and refunds follow the policy shown on the event.',
        ],
      },
      {
        heading: 'Content',
        paragraphs: [
          'You keep ownership of what you publish (texts, photos). You allow Doulisha to display it to run the service. Illegal, misleading or hateful content, or content that harms others, is forbidden and may be removed, and the account suspended.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'Doulisha connects participants and organizers but does not organize the events. To the extent permitted by law, Doulisha is not responsible for how an event runs or for money exchanged between participants and organizers.',
        ],
      },
      {
        heading: 'Governing law and contact',
        paragraphs: [
          `These terms are governed by Tunisian law. For any question: ${LEGAL_CONTACT}. They may change; the date of the last update is at the top of the page.`,
        ],
      },
    ],
  },
  dataDeletion: {
    intro: 'You can ask at any time for your Doulisha account and your data to be deleted.',
    sections: [
      {
        heading: 'Ask for deletion',
        items: [
          `Write to ${LEGAL_CONTACT} with the subject “Account deletion”.`,
          'Send it from your account’s email address, or give your account’s phone number, so we can check it is really you.',
          'We delete the account within 30 days and confirm it to you in writing.',
        ],
      },
      {
        heading: 'What is deleted',
        items: [
          'Your account, your profile and your photo.',
          'The Google or Facebook connections linked to your account.',
          'Your organizer profile and its photos, if you have one.',
        ],
      },
      {
        heading: 'What may be kept',
        paragraphs: [
          'Records of bookings and payments already made may be kept when organizers and accounting need them, no longer linked to an active account, then deleted.',
        ],
      },
      {
        heading: 'Remove Doulisha from Google or Facebook',
        items: [
          'In Doulisha: “My account” → “Sign-in methods” → “Remove”.',
          'In Facebook: Settings → Apps and websites → Doulisha → Remove.',
          'In Google: myaccount.google.com → Security → Third-party connections → Doulisha → Delete connections.',
        ],
      },
    ],
  },
};

const ar: Record<LegalKind, LegalDocument> = {
  privacy: {
    intro:
      'دوليشة منصة لاكتشاف الفعاليات والأنشطة في تونس وتنظيمها والحجز فيها. تشرح هذه الصفحة البيانات التي تحفظها دوليشة، ولماذا، وكيف تبقى متحكّمًا فيها.',
    sections: [
      {
        heading: 'من المسؤول عن بياناتك',
        paragraphs: [
          `الخدمة هي دوليشة، وهي مشروع قيد التطوير. لأي سؤال عن بياناتك: ${LEGAL_CONTACT}.`,
        ],
      },
      {
        heading: 'ما الذي نحفظه',
        items: [
          'حسابك: الاسم، رقم الهاتف و/أو البريد الإلكتروني، المدينة، كلمة المرور (محفوظة مشفّرة، وليس كنصّ عادي أبدًا).',
          'إذا سجّلت الدخول عبر Google أو Facebook: اسمك، بريدك الإلكتروني (إذا وفّرته الخدمة)، صورة ملفك الشخصي ومعرّف حسابك لدى تلك الخدمة. لا نقرأ أصدقاءك ولا منشوراتك، ولا ننشر شيئًا باسمك.',
          'حجوزاتك: أسماء المشاركين وهواتفهم وبريدهم كما تكتبها، الإجابات على أسئلة المنظّم، نقطة الالتقاء المختارة، التذاكر ورموز QR، وتسجيلات الدخول عند الاستقبال.',
          'المدفوعات: طريقة الدفع المختارة، المبالغ، وصولات D17 أو التحويل التي ترسلها، وقرارات المنظّم (تأكيد الدفع أو رفض الوصل).',
          'المنظّمون: معلومات ملفهم العام (الاسم، التقديم، الصور، روابط الشبكات، وسائل الاتصال) وبيانات الدفع التي يختارون إظهارها للمشترين (رقم D17، الـRIB).',
          'الدعوات الخاصة: قائمة المدعوين وردودهم.',
          'الرابط الذي أوصلك إلى الفعالية (مثلًا «مشاركة عبر واتساب»)، ليعرف المنظّم أي المشاركات تنجح.',
        ],
      },
      {
        heading: 'لماذا',
        items: [
          'لتسجيل دخولك وحماية حسابك (رموز عبر SMS أو البريد، كلمة المرور، Google، Facebook).',
          'لحجز الأماكن وإصدار التذاكر وتمكين المنظّم من إدارة فعاليته (قائمة المشاركين، المدفوعات، الاستقبال).',
          'لإرسال الرسائل المتعلقة بحجوزاتك: الرموز، تأكيد الدفع، رفض الوصل، إلغاء الحجز، التذكيرات.',
          'لعرض الملفات العامة للمنظّمين والفعاليات العامة.',
        ],
        paragraphs: ['لا تعرض دوليشة إعلانات ولا تبيع بياناتك.'],
      },
      {
        heading: 'من يرى ماذا',
        items: [
          'يرى منظّم الفعالية بيانات المشاركين في فعاليته: الأسماء، وسائل الاتصال، الإجابات، المدفوعات والوصولات.',
          'الفعاليات الخاصة لا تُعرض ولا تفهرسها محركات البحث أبدًا، وقائمة مدعوّيها لا يراها إلا المضيفون والمدعوون.',
          'الملف العام للمنظّم ظاهر للجميع.',
        ],
      },
      {
        heading: 'مزوّدو الخدمات التقنية',
        paragraphs: [
          'لكي تعمل، تستعين دوليشة بمزوّدين يعالجون البيانات لحسابها: Neon (قاعدة البيانات)، Vercel (استضافة الموقع)، وGoogle وMeta (Facebook) لتسجيل الدخول فقط إذا اخترته. بعض هذه الخوادم خارج تونس، خاصة في الولايات المتحدة. ستُضاف خدمات إرسال الرسائل القصيرة والبريد وتخزين الملفات قبل الإطلاق العام، وسنحدّث هذه الصفحة.',
        ],
      },
      {
        heading: 'ملفات تعريف الارتباط (الكوكيز)',
        paragraphs: [
          'تستعمل دوليشة الكوكيز الضرورية فقط: إبقاء جلستك مفتوحة، تذكّر لغتك، والسماح بالحجز دون حساب (جلسة ضيف). لا كوكيز إعلانية ولا للتتبّع.',
        ],
      },
      {
        heading: 'مدة الحفظ',
        paragraphs: [
          'تُحفظ بيانات حسابك ما دام حسابك موجودًا. قد تُحفظ سجلات الحجوزات والمدفوعات مدة أطول عند حاجة المنظّمين والمحاسبة إليها، ثم تُحذف.',
        ],
      },
      {
        heading: 'حقوقك',
        paragraphs: [
          `يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بالكتابة إلى ${LEGAL_CONTACT}. ويمكنك أيضًا إزالة Google أو Facebook من حسابك في أي وقت من «حسابي». لحذف حسابك، راجع صفحة «حذف البيانات».`,
        ],
      },
      {
        heading: 'التعديلات',
        paragraphs: ['قد تتغيّر هذه السياسة مع تطوّر الخدمة. تاريخ آخر تحديث مذكور أعلى الصفحة.'],
      },
    ],
  },
  terms: {
    intro:
      'تنطبق هذه الشروط على كل من يستعمل دوليشة: المشاركين، الضيوف، مضيفي الدعوات الخاصة والمنظّمين.',
    sections: [
      {
        heading: 'الخدمة',
        paragraphs: [
          'تتيح دوليشة اكتشاف الفعاليات والأنشطة، وحجز الأماكن، وإنشاء الفعاليات، وإرسال الدعوات الخاصة. دوليشة مشروع قيد التطوير: قد تتغيّر بعض الخصائص أو تتوقف أو تحتوي على أخطاء.',
        ],
      },
      {
        heading: 'حسابك',
        items: [
          'قدّم معلومات صحيحة واحتفظ بكلمة مرورك ورموزك لنفسك.',
          'أنت مسؤول عمّا يتم من خلال حسابك.',
          'يمكنك تسجيل الدخول برمز (SMS أو بريد)، أو بكلمة مرور، أو عبر Google أو Facebook.',
        ],
      },
      {
        heading: 'المنظّمون',
        items: [
          'المنظّم وحده مسؤول عن فعاليته: صحة المعلومات، السلامة، التراخيص، سير الفعالية، والاسترداد حسب سياسة الإلغاء المعروضة في الفعالية.',
          'المدفوعات عبر D17 أو التحويل أو نقدًا تذهب مباشرة إلى المنظّم. دوليشة لا تستلم هذا المال ولا تحتفظ به.',
          'لا يستعمل المنظّم بيانات المشاركين إلا لفعاليته.',
        ],
      },
      {
        heading: 'المشاركون',
        items: [
          'يكون الحجز مؤكدًا عندما تُظهر التذكرة رمز QR. بالنسبة إلى D17 والتحويل، يحدث ذلك بعد أن يؤكد المنظّم الدفع.',
          'احترم قواعد المنظّم وتعليمات السلامة.',
          'يخضع الإلغاء والاسترداد للسياسة المعروضة في الفعالية.',
        ],
      },
      {
        heading: 'المحتوى',
        paragraphs: [
          'تبقى مالكًا لما تنشره (نصوص، صور)، وتسمح لدوليشة بعرضه لتشغيل الخدمة. يُمنع المحتوى غير القانوني أو المضلّل أو الذي يحضّ على الكراهية أو يمسّ بالآخرين، ويمكن حذفه وتعليق الحساب.',
        ],
      },
      {
        heading: 'المسؤولية',
        paragraphs: [
          'تربط دوليشة بين المشاركين والمنظّمين لكنها لا تنظّم الفعاليات. في الحدود التي يسمح بها القانون، لا تتحمّل دوليشة مسؤولية سير الفعالية ولا المبالغ المتبادلة بين المشاركين والمنظّمين.',
        ],
      },
      {
        heading: 'القانون المطبّق والاتصال',
        paragraphs: [
          `تخضع هذه الشروط للقانون التونسي. لأي سؤال: ${LEGAL_CONTACT}. قد تتغيّر هذه الشروط، وتاريخ آخر تحديث مذكور أعلى الصفحة.`,
        ],
      },
    ],
  },
  dataDeletion: {
    intro: 'يمكنك في أي وقت طلب حذف حسابك في دوليشة وبياناتك.',
    sections: [
      {
        heading: 'طلب الحذف',
        items: [
          `اكتب إلى ${LEGAL_CONTACT} مع الموضوع «حذف الحساب».`,
          'أرسله من البريد الإلكتروني لحسابك، أو اذكر رقم الهاتف المرتبط بحسابك، لنتحقّق من أنك صاحب الحساب.',
          'نحذف الحساب خلال 30 يومًا ونؤكّد لك ذلك كتابيًا.',
        ],
      },
      {
        heading: 'ما يُحذف',
        items: [
          'حسابك وملفك الشخصي وصورتك.',
          'روابط Google أو Facebook المرتبطة بحسابك.',
          'ملفك كمنظّم وصوره، إن وُجد.',
        ],
      },
      {
        heading: 'ما قد يُحتفظ به',
        paragraphs: [
          'قد تُحفظ سجلات الحجوزات والمدفوعات التي تمّت عند حاجة المنظّمين والمحاسبة إليها، دون ربطها بحساب نشط، ثم تُحذف.',
        ],
      },
      {
        heading: 'إزالة دوليشة من Google أو Facebook',
        items: [
          'من دوليشة: «حسابي» ← «طرق تسجيل الدخول» ← «إزالة».',
          'من Facebook: الإعدادات ← التطبيقات ومواقع الويب ← Doulisha ← إزالة.',
          'من Google: myaccount.google.com ← الأمان ← اتصالات الجهات الخارجية ← Doulisha ← حذف الاتصالات.',
        ],
      },
    ],
  },
};

export const legalDocuments: Record<Locale, Record<LegalKind, LegalDocument>> = { ar, fr, en };
