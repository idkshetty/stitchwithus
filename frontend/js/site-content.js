import { POLICY_DEFAULTS } from './policy-defaults.js';

export const MAX_IMAGE_LENGTH = 5_500_000;

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeImage(value, fallback = '') {
  const str = String(value ?? '').trim();
  if (!str) return fallback;
  if (/^assets\/[\w\-./]+$/i.test(str)) return str;
  if (/^https:\/\/[^\s<>"']+$/i.test(str)) return str;
  if (/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(str) && str.length <= MAX_IMAGE_LENGTH) {
    return str;
  }
  return fallback;
}

export function safeLink(value, fallback = '#home') {
  const str = String(value ?? '').trim();
  if (!str) return fallback;
  if (/^#(?:home|about|events|event\/[a-z0-9-]+|1-on-1|courses|wizard-plus|wizard|checkout|contact|terms|privacy|shipping|usage-guidelines|site-rules|admin(?:\/[a-z0-9-]+)?)$/i.test(str)) {
    return str;
  }
  if (/^https?:\/\/[^\s<>"']+$/i.test(str)) return str;
  if (/^mailto:[^\s<>"']+@[^\s<>"']+$/i.test(str)) return str;
  if (/^tel:\+?[\d\s-]+$/i.test(str)) return str;
  return fallback;
}

const field = (label, value, kind = 'text', max = 160) => ({ label, value, kind, max });
const body = (label, value, max = 25000) => field(label, value, 'textarea', max);
const link = (label, value) => field(label, value, 'link', 500);
const picture = (label, value) => field(label, value, 'image', MAX_IMAGE_LENGTH);
const toggle = (label, value = true) => field(label, value, 'checkbox');

export const CONTENT_SCHEMA = {
  brand: {
    label: 'Brand & contact details',
    fields: {
      name: field('Brand name', 'You Can Stitch With Us', 'text', 120),
      tagline: field('Brand tagline', 'Learn. Create. Collaborate.', 'text', 160),
      pageTitle: field('Browser tab title', 'You Can Stitch With Us | Art Community', 'text', 160),
      logo: picture('Header logo', 'assets/images/logo-nav.png'),
      squareLogo: picture('About page square logo', 'assets/images/logo-square.png'),
      email: field('Contact email', 'youcanstitchwithus@gmail.com', 'text', 160),
      supportEmail: field('Support email', 'support@youcanstitchwithus.com', 'text', 160),
      whatsapp: field('WhatsApp number', '+91 9633400597', 'text', 40),
      instagramHandle: field('Instagram handle', '@youcanstitchwithus', 'text', 80),
      instagramUrl: link('Instagram URL', 'https://www.instagram.com/youcanstitchwithus/'),
      founderInstagram: field('Founder Instagram handle', '@hoopables', 'text', 80),
      founderInstagramUrl: link('Founder Instagram URL', 'https://www.instagram.com/hoopables/'),
      hoopablesStoreUrl: link('Hoopables store URL', 'https://www.hoopables.in/store'),
      location: field('Studio location', 'Saket, New Delhi, Delhi, India', 'text', 160),
      facebookUrl: link('Facebook URL', 'https://www.facebook.com/youcanstitchwithus/'),
      youtubeUrl: link('YouTube URL', 'https://www.youtube.com/')
    }
  },
  navigation: {
    label: 'Header & navigation',
    fields: {
      home: field('Home link label', 'Home', 'text', 40),
      about: field('About link label', 'About', 'text', 40),
      events: field('Events link label', 'Events', 'text', 40),
      oneOnOne: field('1:1 link label', '1:1', 'text', 40),
      courses: field('Courses link label', 'Courses', 'text', 40),
      wizard: field('Wizard link label', 'Wizard', 'text', 40),
      wizardPlus: field('Wizard Plus link label', 'Wizard Plus', 'text', 40),
      more: field('More menu label', 'More', 'text', 40)
    }
  },
  home: {
    label: 'Home page copy',
    fields: {
      heroTitlePrefix: field('Hero title prefix', 'You Can ', 'text', 60),
      heroStitchText: field('Hero highlighted word', 'Stitch', 'text', 40),
      heroTitleSuffix: field('Hero title suffix', ' With Us', 'text', 60),
      heroSubtitle: field('Hero subtitle', 'Learn. Create. Collaborate.', 'text', 120),
      tealHeading: field('Kit section heading', 'Learn stitch craft\nwith a kit delivered\nto you', 'textarea', 160),
      tealCtaLabel: field('Kit section button label', 'Explore Courses', 'text', 60),
      tealHandNote: field('Kit section handwritten note', 'Embroidery is a slow craft.\nHappy learning!', 'textarea', 140),
      railHeading: field('Highlights rail heading', 'Everything in\none place', 'textarea', 120),
      galleryEyebrow: field('Community gallery eyebrow', 'Gatherings & Stitch-Alongs', 'text', 80),
      meetupsTitle: field('Meetup testimonials heading', 'Heard at our meetups', 'text', 120),
      closingKicker: field('Closing section eyebrow', 'READY TO SIT WITH US?', 'text', 80),
      closingHeading: field('Closing section heading', 'Make slow craft\npart of your week', 'textarea', 160),
      closingCtaLabel: field('Closing button label', 'Join a Course', 'text', 60),
      closingHandNote: field('Closing handwritten note', 'Start stitching\ntoday', 'textarea', 100),
      ctaCourses: field('Courses pill button', 'Courses', 'text', 40),
      ctaEvents: field('Events pill button', 'Events', 'text', 40),
      ctaPrivate: field('Private Lessons pill button', 'Private Lessons', 'text', 40),
      makersHeading: field('Community section heading', 'A Community of Makers', 'text', 120),
      makersBody1: body('Community paragraph 1', 'You Can Stitch With Us is a community of artists and art enthusiasts. Our mission is to bring people with a passion for creation together to learn, create and collaborate.', 600),
      makersBody2: field('Community paragraph 2', 'Join us on this creative journey.', 'text', 240),
      makersSignoff: field('Community sign-off', 'Come, You can sit with us :)', 'text', 160),
      collabHeading: field('Collaborate section heading', 'Let us Collaborate', 'text', 120),
      collabBody: body('Collaborate description', 'If you are an artist or an organization and believe we could work together in any capacity to facilitate meet ups, workshops and more, please fill in the form below.', 600),
      collabButton: field('Collaborate button label', 'Take me in', 'text', 60),
      collabFormUrl: link('Collaborate form URL', 'https://docs.google.com/forms/d/1-O2N9wMOFPgaoiYMvZNGlfLgOZj0DtME4MgxGVLHxOI/viewform?edit_requested=true'),
      instaHeading: field('Instagram hashtag heading', '#YouCanStitchWithUs', 'text', 80),
      instaSubtext: field('Instagram follow text', 'Follow us on Instagram @youcanstitchwithus', 'text', 160)
    }
  },
  about: {
    label: 'About & founder',
    fields: {
      pageTitle: field('About page title', 'About', 'text', 80),
      communityHeading: field('About community heading', 'You Can Stitch With Us', 'text', 120),
      communityP1: body('About paragraph 1', 'You Can Stitch With Us is a community of artists and art enthusiasts, not limited to hand embroidery.', 500),
      communityP2: body('About paragraph 2', 'Our mission is to bring people with a passion for hand-craft together to learn, create and collaborate.', 500),
      communityP3: body('About paragraph 3', 'At You Can Stitch With Us, we believe that learning is a journey that should be done together. We provide a safe and inclusive space for our community to explore and learn, built on friendship and togetherness.', 800),
      communityP4: field('About sign-off', "No matter what you're learning,\nyou can sit with us. :)", 'textarea', 240),
      founderName: field('Founder name', 'Anupama', 'text', 80),
      founderRole: field('Founder role', 'Founder', 'text', 80),
      founderPhoto: picture('Founder portrait', 'assets/images/founder-anupama.jpeg'),
      founderBio: body('Founder bio', 'Our learning pod is hosted by Anupama, a passionate hand embroidery artist, small business owner and an art facilitator. She is dedicated to creating meaningful, hands-on learning experiences that help her students explore their creative potential and gain the skills they need to thrive.', 1000),
      founderNote: field('Founder social note', 'You’ll get to see more of her at @hoopables', 'text', 160)
    }
  },
  coursesPage: {
    label: 'Courses page & welcome kit',
    fields: {
      heading: field('Courses page heading', 'Learn with Us', 'text', 100),
      subheading: field('Courses page subheading', 'Explore Hand Embroidery Courses', 'text', 160),
      paymentNote: body('Manual payment note', 'Note: If you are facing issues while making payments, opt for the ‘manual payment’ option during checkout and contact us on Instagram @youcanstitchwithus', 400),
      kitHeading: field('Welcome kit heading', 'Included in your welcome kit', 'text', 120),
      kitImage: picture('Welcome kit photo', 'assets/images/welcome-kit.jpeg'),
      kitButtonLabel: field('Welcome kit CTA label', 'Shop at Hoopables', 'text', 60),
      kitItemsText: body('Welcome kit items (one per line)', '6” Premium Hoop\nFabric\nFabric with printed pattern\nNeedles\nFloss Bundles\nThread Cutter/ Scissors\nHeat Erasable Pen', 1000),
      videoUrl: field('Course intro video URL (YouTube/MP4, optional)', '', 'text', 400),
      videoPoster: picture('Course intro poster image', 'assets/images/welcome-kit.jpeg'),
      videoCaption: field('Course intro caption', 'A peek inside our pre-recorded hand embroidery modules with Anupama', 'text', 200),
      howToHeading: field('How to join heading', 'How to join?', 'text', 80),
      step1Title: field('Step 1 title', 'Sign up', 'text', 40),
      step1Desc: field('Step 1 text', 'Pick a tier of your choice & sign up', 'text', 200),
      step2Title: field('Step 2 title', 'Access', 'text', 40),
      step2Desc: field('Step 2 text', 'Get access to the pre-recorded modules within 24-48 hours.', 'text', 200),
      step3Title: field('Step 3 title', 'Start', 'text', 40),
      step3Desc: field('Step 3 text', 'Embroidery is a slow craft. Watch at your pace. Happy learning!', 'text', 200),
      step4Title: field('Step 4 title', 'Reach Out', 'text', 40),
      step4Desc: field('Step 4 text', 'Share your progress via our exclusive Whatsapp Support. We got you!', 'text', 200),
      testimonialBg: picture('Courses testimonial backdrop', 'assets/images/courses-testimonial-bg.jpg')
    }
  },
  eventsPage: {
    label: 'Workshops & events header',
    fields: {
      heading: field('Events page heading', 'Workshops & events', 'text', 120),
      testimonialsHeading: field('OG learners heading', "Here's what our OG learners have to say:", 'text', 160)
    }
  },
  oneOnOne: {
    label: '1:1 Tailored Embroidery Session',
    fields: {
      title: field('Session title', '1:1 Tailored Embroidery Session', 'text', 120),
      badge: field('Availability badge', 'Available online', 'text', 60),
      duration: field('Session duration', '1 hr 30 min', 'text', 60),
      priceLabel: field('Display price', 'From ₹1,600', 'text', 60),
      ctaLabel: field('Booking button label', 'Book a session', 'text', 50),
      heroImage: picture('Session hero image', 'assets/images/session-hero.jpg'),
      serviceDescription: body('Service description', "Our private workshop is tailored to your personal needs, providing a unique and personalized learning experience. Whether you're a beginner or looking to refine your skills, our expert instructors will guide you through the art of embroidery and help you create a stunning work of art.", 1200),
      learnHeading: field('What will you learn heading', 'What will you learn', 'text', 80),
      learnImage: picture('What will you learn photo', 'assets/images/session-what-you-learn.jpeg'),
      learnP1: body('What will you learn paragraph 1', 'If you are a complete beginner, in your first session, you can expect to get a crash course on the materials used for hand embroidery and pattern transferring techniques.', 800),
      learnP2: body('What will you learn paragraph 2', 'Depending on the expertise and the pace of the participants, we usually cover 4-5 basic embroidery stitches. You may also request for revision videos and practise designs at the end of the session.', 800),
      hostHeading: field('About the host heading', 'About the host', 'text', 80),
      hostImage: picture('Host portrait', 'assets/images/founder-anupama.jpeg'),
      hostP1: body('About host paragraph 1', 'With a successful brand under her belt for the past 5 years, our instructor Anupama brings a wealth of practical knowledge and hands-on experience to the table. Her journey of running her own brand has provided her with an in-depth understanding of the nuances and intricacies of hand embroidery.', 1000),
      hostP2: body('About host paragraph 2', "Anupama's track record of hosting multiple workshops further solidifies her credentials as an exceptional instructor. Her ability to effectively communicate and engage with participants in these workshops showcases her teaching prowess.", 1000),
      hostP3: body('About host paragraph 3', 'She has honed her instructional skills, ensuring that she can convey complex concepts in a clear and accessible manner, catering to students of varying skill levels.', 1000)
    }
  },
  contact: {
    label: 'Contact page',
    fields: {
      heading: field('Contact heading', 'Contact Us', 'text', 80),
      subheading: field('Contact subheading', 'Get in touch!', 'text', 100),
      p1: body('Contact paragraph 1', 'You Can Stitch With Us brings together the joy of stitching with the power of collaboration. We offer stitch alongs, workshops, and collaborations to help bring your creative visions to life.', 600),
      p2: body('Contact paragraph 2', 'Contact us for more information and get ready to make your stitching dreams come true!', 400),
      emailPrefix: field('Email intro label', 'Or email us at:', 'text', 80),
      submitLabel: field('Submit button label', 'Submit', 'text', 40),
      successMessage: field('Success confirmation message', 'Thanks for submitting!', 'text', 120)
    }
  },
  footer: {
    label: 'Footer & newsletter',
    fields: {
      newsletterHeading: field('Mailing list heading', 'Join our mailing list', 'text', 80),
      newsletterPlaceholder: field('Email placeholder', 'Enter your email here*', 'text', 80),
      newsletterButton: field('Subscribe button', 'Subscribe Now', 'text', 40),
      newsletterSuccess: field('Subscribe confirmation', 'Thanks for submitting!', 'text', 100),
      termsLabel: field('Terms link label', 'Terms of Service', 'text', 60),
      privacyLabel: field('Privacy link label', 'Privacy Policy', 'text', 60),
      contactLabel: field('Contact link label', 'Contact', 'text', 60),
      shippingLabel: field('Shipping link label', 'Shipping, Returns and Refunds', 'text', 80),
      usageLabel: field('Usage policies link label', 'Usage Policies & Community Guidelines', 'text', 80),
      copyrightLine1: field('Copyright line 1', '© Madurakkaran Nandakumar Anupama', 'text', 120),
      copyrightLine2: field('Copyright line 2', '2024 All rights reserved', 'text', 80)
    }
  },
  policies: {
    label: 'Legal & policy pages',
    fields: Object.fromEntries(
      Object.entries(POLICY_DEFAULTS).map(([k, val]) => [
        k,
        k.endsWith('Body') ? body(`${k} text`, val) : field(`${k} title`, val, 'text', 140)
      ])
    )
  },
  sections: {
    label: 'Section visibility',
    fields: {
      showCommunityGallery: toggle('Show Home community photo slideshow', true),
      showMeetupTestimonials: toggle('Show Home meet-up testimonials carousel', true),
      showCollaborate: toggle('Show Home Let us Collaborate section', true),
      showInstagramBand: toggle('Show Home #YouCanStitchWithUs Instagram band', true),
      showFooterNewsletter: toggle('Show footer mailing list signup', true)
    }
  }
};

export const DEFAULT_COURSES = [
  {
    id: 'wizard-plus',
    route: '#wizard-plus',
    name: 'Wizard Plus',
    price: 4999,
    currency: '₹',
    subtitle: 'Kickstart, refine & progress your hand embroidery',
    validity: 'Valid until canceled',
    ctaLabel: 'Join',
    featured: true,
    badge: 'Most Popular',
    heroImage: 'assets/images/wizard-plus-banner.jpg',
    features: [
      'Lifetime access to 30+ pre-recorded modules',
      'Embroidery kit shipped to you (Indian Residents only)',
      'Learn at your pace',
      'Beginner friendly',
      'About raw materials',
      'Pattern transferring techniques',
      '17 stitches and their application',
      'Includes basic needle painting',
      'Hoop Backing Techniques',
      'Fun Assignments',
      'Tips & tricks',
      'Whatsapp Support & Personal Mentorship',
      'Certificate upon completion',
      'Coupon code for 15% off Hoopables supplies'
    ]
  },
  {
    id: 'wizard',
    route: '#wizard',
    name: 'Wizard',
    price: 3999,
    currency: '₹',
    subtitle: 'Hand embroidery for newbies',
    validity: 'Valid until canceled',
    ctaLabel: 'Join',
    featured: false,
    badge: 'Beginner Starter',
    heroImage: 'assets/images/wizard-banner.jpg',
    features: [
      'Lifetime access to 25 pre-recorded modules',
      'Embroidery kit shipped to you (Indian Residents only)',
      'Beginner friendly',
      'Learn at your pace',
      'Pattern transferring techniques',
      'About raw materials',
      '12 stitches and their application',
      'Hoop Backing Techniques',
      'Tips & tricks',
      'Whatsapp Support',
      'Certificate upon completion'
    ]
  }
];

export const DEFAULT_EVENTS = [
  {
    slug: 'stitching-the-spring-nature-walk-workshop-women-only',
    title: 'Stitching the Spring: Nature Walk & Workshop (Women Only)',
    shortDate: 'Sat, 14 Mar',
    fullDateTime: '14 Mar 2026, 7:30 am – 11:00 am',
    venueShort: 'Lodhi Garden',
    venueFull: 'Lodhi Garden, Lodhi Rd, Lodhi Gardens, Lodhi Estate, New Delhi, Delhi 110003, India',
    badges: ['0 tickets left', 'Membership Offer'],
    status: 'closed',
    buttonLabel: 'Registrations closed',
    image: 'assets/images/event-stitching-spring.png',
    summary: 'This March, we’re collaborating with Women and Wilderness for a women-only, slow morning in nature. We’ll begin with a guided walk noticing Delhi’s native blooms and hidden stories, then translate what we discover into a spring-themed embroidery session.',
    details: `14th March 2026 | Saturday | 7.30 am onwards | 📍 Lodhi Garden

This March, we’re gathering for a slow spring morning in one of Delhi’s most beautiful green spaces.

In collaboration with Women and Wilderness, this women-only experience begins with a guided nature walk from 7:30 am. Together, we’ll explore the native flora and fauna of Lodhi Garden, noticing what’s blooming, what’s changing with the season, and the quiet details we often walk past.

Spring in Delhi is brief and generous. This is an invitation to experience it fully, not just admire it.

After the walk, we’ll gather under the trees for a hands-on, beginner friendly, spring-themed embroidery workshop. Inspired by what we’ve observed, we’ll translate petals, leaves, texture and tiny details into thread and fabric. The full session will last approximately 2 to 2.5 hours.

All materials will be provided — hoop, fabric, embroidery threads, needles and cutters. You don’t need to bring anything craft-related.

Please bring:
• Comfortable walking shoes
• A water bottle
• A small mat or cloth to sit on
• Light snacks for yourself

No prior embroidery experience is needed.

About the Hosts
Nidhi & Lakshmi — Nidhi Batra and Rama Lakshmi Dhavala are the co-founders of Women and Wilderness. Through their women-only walks across Delhi’s green spaces, they create thoughtful, safe spaces for women to slow down and truly observe the natural world. Their approach is rooted in curiosity, learning about native species, seasonal rhythms and building a deeper relationship with the land we live on.

Anupama — Anupama is the founder of Hoopables and You Can Stitch With Us, and has been practicing embroidery for nearly seven years. An embroidery artist with a deep love for botanicals, she works at the intersection of storytelling and craft. She hosts both online and offline workshops, making embroidery accessible, meditative and rooted in observation. Her sessions focus on helping participants translate what they see and feel into thread.

This is a women-only walk and workshop. Limited spots to keep the experience intimate.
Come walk. Come notice. Come stitch. 🌿✨`
  },
  {
    slug: 'bengaluru-meetup-3',
    title: 'Bengaluru Meetup',
    shortDate: 'Sun, 22 Feb',
    fullDateTime: '22 Feb 2026, 10:00 am – 12:00 pm IST',
    venueShort: 'Cubbon Park',
    venueFull: 'Cubbon Park, Kasturba Rd, behind High Court of Karnataka, Ambedkar Veedhi, Sampangi Rama Nagara, Bengaluru, Karnataka 560001, India',
    badges: [],
    status: 'closed',
    buttonLabel: 'Details',
    image: 'assets/images/event-bengaluru-meetup.png',
    summary: 'A fun cozy gathering where we meet to get to know each other, share WIPs and laughs & have a good time in general (You need not be an artist to be a part of this)',
    details: `We’re meeting on 22nd February 2026 at Cubbon Park, Bengaluru to sit together, make things and spend an easy morning in the park.

You don’t need to be an artist, or even particularly confident. This is a come-as-you-are kind of space.

Bring your own materials or use what we have. Embroidery, painting, knitting, crochet, music or any other form of making is welcome. You can chat, listen, share ideas or quietly work on your own thing.

Introverts included, always.

Just come, sit with us and see where the morning goes 🤍

RSVP www.youcanstitchwithus.com or Whatsapp wa.me/9633400597`
  },
  {
    slug: 'delhi-meetup-14-dec-2025',
    title: 'Delhi Meetup - 14 Dec 2025',
    shortDate: 'Sun, 14 Dec',
    fullDateTime: '14 Dec 2025, 11:00 am',
    venueShort: 'Hauz Khas District Park',
    venueFull: 'Hauz Khas District Park, Africa Avenue, Hauz Khas, Deer Park, Hauz Khas, New Delhi, Delhi 110016, India',
    badges: [],
    status: 'closed',
    buttonLabel: 'Details',
    image: 'assets/images/event-delhi-meetup.png',
    summary: 'A fun cozy gathering where we meet to get to know each other, share WIPs and laughs & have a good time in general (You need not be an artist to be a part of this)',
    details: `Join us for a quiet space of art, conversation, and community as we sit together, reflect on the year so far, and dream about what we want to create and grow into in the coming week.

This time, we’re also doing a mini potluck ✨
Feel free to bring a little something to snack on and share while we stitch (vegetarian options preferred 🌿). Nothing fancy or stressful - just comfort food, warm company, and art supplies.

If you’ve been looking for a space to slow down, make art, and meet like-minded creatives in the city, consider this your sign.

Bring your hoop, your current project, and your softest self.`
  }
];

export const DEFAULT_TESTIMONIALS = {
  meetups: [
    {
      quote: "Had the bestest, most refreshing time today, let's please do this more often! thankyou Anupama 🌻",
      author: 'Swaati (Quillkaariwali)'
    },
    {
      quote: "It was so nice to meet all of you ☺️ Yes please, let's meet at least once a month",
      author: 'Liza (Golka Gallery)'
    },
    {
      quote: "I had such a fun time today. I was almost not sure if i should come or not but so glad i did. Was so nice to see you guys doing good and hearing relatable things from you ! 🥹❤️ Looking forward to seeing you all again. :)",
      author: 'Aayushi (theautumnstitches)'
    },
    {
      quote: "It was great meeting you all … wasn’t expecting to have such a wholesome evening and connecting with amazing artists ☺️☺️ Ps: would love to hangout more and meeting you all soon❤️",
      author: 'Kritika (suidhaagabykritika)'
    },
    {
      quote: "Today was super super fun 🥳 it’s so nice to explore people of different different art forms , can do more often 🌈",
      author: 'Saumiya (@_knotjustthreads_)'
    },
    {
      quote: "Today was great, even though I didn't get to chat with everyone. Seeing all that incredible art was super inspiring - it's definitely motivated me to get back into creating myself! Looking forward to connecting with more of you on Instagram and at future meet-ups.",
      author: 'Aswathy (@hanginthere_by_aswathy)'
    },
    {
      quote: "It was indeed a lovely catch up and we need to do this more often .. thanks @Hoopables for making this happen ..",
      author: 'Vandana (@vand.erer)'
    },
    {
      quote: "It was my first time attending a meet up like this and it was amazing! Would love to keep interacting with y’all. @Anupama kudos to you for pulling this off and so nicelyyyy ❤️",
      author: 'Diksha (@tiedtries)'
    },
    {
      quote: "This was a much needed meet up, I guess! Loved interacting with each one of you today! 🤗",
      author: 'Kriti (@label_wildchild)'
    }
  ],
  learners: [
    {
      quote: '“Amazing workshop! Anupama explained everything in the simplest way possible. Looking forward to more such workshops :)”',
      author: 'Akshada Mulay'
    },
    {
      quote: '"I would like to say a big thanks to you. Atlast one of the item in my bucket list is fulfilled. From long time I was thinking to learn embroidery as to make a hobby. So I believe I reached to an absolute teacher after I met u. You are not only a wonderful artist, but have a very patience, open heart & sincere in your passion & profession. Thank you so much!”',
      author: 'Saphalya Satheendran'
    },
    {
      quote: '“Anupama was very patient and methodological in teaching the nuances of the design. She also shared numerous tips and tricks throughout the session.”',
      author: 'Sonalee S'
    },
    {
      quote: '“Anupama organized such a wonderful workshop! I really enjoyed learning the basics of embroidery along with six different types of stitches. Thanks to her and this session, I have now found a new favourite hobby. Much love! Thank you!!”',
      author: 'Jennissa Thomas'
    },
    {
      quote: "“Loved it! Learnt quite a few techniques in just 2 hours... and it was quite a bit of fun. Have been following Hoopables for some time now on Instagram & I really love Anupama's work. So, learning from her was great”",
      author: 'Divvya Madhok'
    },
    {
      quote: "“Wonderful experience! She was super patient and explained every stitch in detail and repeatedly. I'd definitely recommend it to anyone interested in embroidery. It doesn't matter if you have a basic idea of stitches or if you're an absolute beginner, this session is totally worth your time. Great job Anupama 😊”",
      author: 'Navnee Chengappa'
    },
    {
      quote: '“It was a wonderful session and Anupama was so patient and repeated the doubts whenever asked. On the whole it was absolutely lovely attending the class❤️”',
      author: 'Royce James'
    }
  ]
};

export const DEFAULT_GALLERIES = {
  homeCommunity: Array.from({ length: 14 }, (_, i) => ({
    src: `assets/images/community/${String(i + 1).padStart(2, '0')}.jpeg`,
    caption: `Community stitch-along & maker meetup moment #${i + 1}`
  })),
  workshops: Array.from({ length: 18 }, (_, i) => ({
    src: `assets/images/workshops/${String(i + 1).padStart(2, '0')}.jpeg`,
    caption: `Workshop & community meetup snapshot #${i + 1}`
  })),
  sessions: Array.from({ length: 8 }, (_, i) => ({
    src: `assets/images/sessions/${String(i + 1).padStart(2, '0')}.jpeg`,
    caption: `1:1 Tailored Embroidery Session work #${i + 1}`
  }))
};

const schemaDefaults = Object.fromEntries(
  Object.entries(CONTENT_SCHEMA).map(([sec, group]) => [
    sec,
    Object.fromEntries(Object.entries(group.fields).map(([k, f]) => [k, f.value]))
  ])
);

export const DEFAULT_CONTENT = {
  ...schemaDefaults,
  courses: structuredClone(DEFAULT_COURSES),
  events: structuredClone(DEFAULT_EVENTS),
  testimonials: structuredClone(DEFAULT_TESTIMONIALS),
  galleries: structuredClone(DEFAULT_GALLERIES)
};

export function normalizeCourse(item, fallback = {}) {
  const src = item && typeof item === 'object' ? item : {};
  const id = String(src.id || fallback.id || `course-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const price = Math.max(0, Number.isFinite(Number(src.price)) ? Number(src.price) : Number(fallback.price || 0));
  const features = Array.isArray(src.features)
    ? src.features.map(s => String(s || '').trim()).filter(Boolean)
    : Array.isArray(fallback.features) ? [...fallback.features] : [];
  return {
    id,
    route: `#${id === 'wizard' || id === 'wizard-plus' ? id : 'courses'}`,
    name: String(src.name || fallback.name || 'Course').slice(0, 80),
    price,
    currency: String(src.currency || fallback.currency || '₹').slice(0, 8),
    subtitle: String(src.subtitle ?? fallback.subtitle ?? '').slice(0, 200),
    validity: String(src.validity ?? fallback.validity ?? 'Valid until canceled').slice(0, 80),
    ctaLabel: String(src.ctaLabel || fallback.ctaLabel || 'Join').slice(0, 40),
    featured: typeof src.featured === 'boolean' ? src.featured : Boolean(fallback.featured),
    badge: String(src.badge ?? fallback.badge ?? '').slice(0, 40),
    heroImage: safeImage(src.heroImage, fallback.heroImage || 'assets/images/wizard-plus-banner.jpg'),
    features
  };
}

export function normalizeEvent(item, fallback = {}) {
  const src = item && typeof item === 'object' ? item : {};
  const title = String(src.title || fallback.title || 'Community Event').slice(0, 160);
  const slug = String(src.slug || fallback.slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `event-${Date.now()}`;
  const status = ['open', 'closed'].includes(src.status) ? src.status : (fallback.status || 'closed');
  const badges = Array.isArray(src.badges)
    ? src.badges.map(b => String(b || '').trim()).filter(Boolean).slice(0, 4)
    : Array.isArray(fallback.badges) ? [...fallback.badges] : [];
  return {
    slug,
    title,
    shortDate: String(src.shortDate ?? fallback.shortDate ?? '').slice(0, 40),
    fullDateTime: String(src.fullDateTime ?? fallback.fullDateTime ?? '').slice(0, 120),
    venueShort: String(src.venueShort ?? fallback.venueShort ?? '').slice(0, 80),
    venueFull: String(src.venueFull ?? fallback.venueFull ?? '').slice(0, 240),
    badges,
    status,
    buttonLabel: String(src.buttonLabel ?? fallback.buttonLabel ?? (status === 'open' ? 'RSVP / Book' : 'Details')).slice(0, 60),
    image: safeImage(src.image, fallback.image || 'assets/images/event-stitching-spring.png'),
    summary: String(src.summary ?? fallback.summary ?? '').slice(0, 600),
    details: String(src.details ?? fallback.details ?? '').slice(0, 10000)
  };
}

export function normalizeTestimonialsList(list, fallback = []) {
  if (!Array.isArray(list) || !list.length) return structuredClone(fallback);
  return list
    .map(item => ({
      quote: String(item?.quote || '').trim().slice(0, 1000),
      author: String(item?.author || '').trim().slice(0, 120)
    }))
    .filter(item => item.quote);
}

export function normalizeGalleryList(list, fallback = []) {
  if (!Array.isArray(list) || !list.length) return structuredClone(fallback);
  return list
    .map(item => ({
      src: safeImage(item?.src, ''),
      caption: String(item?.caption || '').trim().slice(0, 200)
    }))
    .filter(item => item.src);
}

export function normalizeContent(value = {}) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};

  for (const [sec, group] of Object.entries(CONTENT_SCHEMA)) {
    out[sec] = {};
    for (const [key, f] of Object.entries(group.fields)) {
      const raw = src[sec]?.[key];
      if (f.kind === 'checkbox') {
        out[sec][key] = typeof raw === 'boolean' ? raw : f.value;
      } else if (f.kind === 'image') {
        out[sec][key] = typeof raw === 'string' && raw.trim() ? safeImage(raw, f.value) : f.value;
      } else if (f.kind === 'link') {
        out[sec][key] = typeof raw === 'string' && raw.trim() ? safeLink(raw, f.value) : f.value;
      } else if (typeof raw === 'string') {
        out[sec][key] = raw.slice(0, f.max);
      } else {
        out[sec][key] = f.value;
      }
    }
  }

  out.courses = Array.isArray(src.courses) && src.courses.length
    ? src.courses.map((c, idx) => normalizeCourse(c, DEFAULT_COURSES[idx] || {}))
    : structuredClone(DEFAULT_COURSES);

  out.events = Array.isArray(src.events) && src.events.length
    ? src.events.map((ev, idx) => normalizeEvent(ev, DEFAULT_EVENTS[idx] || {}))
    : structuredClone(DEFAULT_EVENTS);

  out.testimonials = {
    meetups: normalizeTestimonialsList(src.testimonials?.meetups, DEFAULT_TESTIMONIALS.meetups),
    learners: normalizeTestimonialsList(src.testimonials?.learners, DEFAULT_TESTIMONIALS.learners)
  };

  out.galleries = {
    homeCommunity: normalizeGalleryList(src.galleries?.homeCommunity, DEFAULT_GALLERIES.homeCommunity),
    workshops: normalizeGalleryList(src.galleries?.workshops, DEFAULT_GALLERIES.workshops),
    sessions: normalizeGalleryList(src.galleries?.sessions, DEFAULT_GALLERIES.sessions)
  };

  return out;
}

export function validateContent(content) {
  if (!content || typeof content !== 'object') return 'Invalid content object.';
  for (const [sec, group] of Object.entries(CONTENT_SCHEMA)) {
    for (const [key, f] of Object.entries(group.fields)) {
      const v = content[sec]?.[key];
      if (f.kind === 'checkbox') {
        if (typeof v !== 'boolean') return `${f.label}: choose true or false.`;
        continue;
      }
      if (typeof v !== 'string' || v.length > f.max) {
        return `${f.label}: must be text up to ${f.max} characters.`;
      }
      if (f.kind === 'link' && v.trim() && safeLink(v, '__bad__') === '__bad__') {
        return `${f.label}: must be a valid #route, https:// URL, mailto:, or tel: link.`;
      }
      if (f.kind === 'image' && v.trim() && safeImage(v, '__bad__') === '__bad__') {
        return `${f.label}: must be an uploaded image, assets/ path, or https:// image URL.`;
      }
    }
  }
  return '';
}

export function parseKitItems(content) {
  return String(content?.coursesPage?.kitItemsText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function formatINR(amount, currency = '₹') {
  const num = Number(amount || 0);
  return `${currency}${num.toLocaleString('en-IN')}`;
}
