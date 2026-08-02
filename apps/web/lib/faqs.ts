export type FaqItem = {
  question: string;
  answer: string[];
  bullets?: string[];
};

export type FaqCategory = {
  title: string;
  items: FaqItem[];
};

export const faqCategories: FaqCategory[] = [
  {
    title: "General",
    items: [
      {
        question: "What is ChaufX?",
        answer: [
          "ChaufX is Canada's personal driver marketplace that connects customers with trusted professional drivers who drive the customer's own vehicle. Whether you need transportation for work, the airport, medical appointments, special events, or everyday errands, ChaufX lets you enjoy the comfort and convenience of your own car while someone else handles the driving."
        ]
      },
      {
        question: "How is ChaufX different from Uber or a taxi?",
        answer: [
          "Unlike rideshare or taxi services, ChaufX drivers drive your vehicle, not their own. This means you travel in the comfort, privacy, and familiarity of your own car while enjoying the convenience of a professional driver."
        ]
      },
      {
        question: "Where is ChaufX available?",
        answer: [
          "ChaufX is launching in the Greater Toronto Area (GTA), beginning with Toronto and Mississauga. Additional service areas will be added as the platform expands."
        ]
      }
    ]
  },
  {
    title: "Booking",
    items: [
      {
        question: "How do I book a driver?",
        answer: ["Booking is simple."],
        bullets: [
          "Create or sign in to your ChaufX account.",
          "Enter your pickup location and destination.",
          "Choose whether you need a driver now or want to schedule a future trip.",
          "Submit your booking request.",
          "An approved driver will accept your trip."
        ]
      },
      {
        question: "Can I schedule a trip in advance?",
        answer: [
          "Yes. You can schedule a driver for a future date and time, making ChaufX ideal for airport transfers, business meetings, medical appointments, events, and other planned travel."
        ]
      },
      {
        question: "Can I book a driver immediately?",
        answer: [
          "Yes. Depending on driver availability in your area, you can request a driver for immediate service during operating hours."
        ]
      },
      {
        question: "Can I make multiple bookings?",
        answer: ["Yes. You can schedule multiple trips in advance or book additional journeys whenever you need them."]
      }
    ]
  },
  {
    title: "Drivers",
    items: [
      {
        question: "Who are ChaufX drivers?",
        answer: [
          "ChaufX drivers are professional drivers who have completed our approval process before becoming active on the platform."
        ]
      },
      {
        question: "Are drivers verified?",
        answer: ["Yes. Every driver must complete ChaufX's screening and approval process before accepting bookings."]
      },
      {
        question: "Can I request the same driver again?",
        answer: [
          "Where possible, ChaufX aims to provide a consistent customer experience. Future platform updates may include preferred driver features based on availability."
        ]
      }
    ]
  },
  {
    title: "Safety & Trust",
    items: [
      {
        question: "Is my vehicle insured while a driver is using it?",
        answer: [
          "Insurance requirements and coverage details are explained during the booking process and in our policies. Customers should review these details before confirming a booking."
        ]
      },
      {
        question: "What if I am not comfortable with my assigned driver?",
        answer: [
          "Your comfort and safety are important. If you have concerns before your trip begins, please contact ChaufX Support for assistance."
        ]
      },
      {
        question: "Can someone travel with me?",
        answer: [
          "Yes. Family members, friends, or colleagues may travel with you, provided your vehicle has enough seating and complies with applicable road safety regulations."
        ]
      },
      {
        question: "Will the driver treat my vehicle with care?",
        answer: [
          "Yes. ChaufX expects every approved driver to operate customer vehicles professionally, safely, and respectfully."
        ]
      }
    ]
  },
  {
    title: "Pricing",
    items: [
      {
        question: "How much does ChaufX cost?",
        answer: [
          "ChaufX offers transparent hourly pricing with no surge pricing or hidden fees. Current pricing is available on our Pricing page."
        ]
      },
      {
        question: "Is there a minimum booking time?",
        answer: ["Yes. The minimum booking duration is two hours."]
      },
      {
        question: "Are there any hidden fees?",
        answer: ["No. Pricing is clearly displayed before you confirm your booking."]
      },
      {
        question: "How do I pay?",
        answer: ["Payments are securely processed through the ChaufX platform using your preferred payment method."]
      }
    ]
  },
  {
    title: "Services",
    items: [
      {
        question: "What can I use ChaufX for?",
        answer: ["Customers commonly book ChaufX for:"],
        bullets: [
          "Airport transportation",
          "Business meetings",
          "Medical appointments",
          "Senior transportation",
          "Personal errands",
          "Shopping trips",
          "Evenings out",
          "Special events",
          "Long-distance travel"
        ]
      },
      {
        question: "Can ChaufX drive me to another city?",
        answer: ["Yes. Longer-distance trips can be booked based on driver availability."]
      },
      {
        question: "Do you provide airport transportation?",
        answer: ["Yes. ChaufX offers scheduled airport transportation using your own vehicle."]
      }
    ]
  },
  {
    title: "Accounts",
    items: [
      {
        question: "Do I need an account to book?",
        answer: [
          "Yes. Creating an account allows you to manage bookings, schedule future trips, review your trip history, and receive updates."
        ]
      },
      {
        question: "Can I cancel my booking?",
        answer: [
          "Yes. Cancellation terms are outlined in our Booking Policy. Please review the policy before confirming your reservation."
        ]
      }
    ]
  },
  {
    title: "Becoming a Driver",
    items: [
      {
        question: "How do I become a ChaufX driver?",
        answer: [
          "Visit the Become a Driver page and complete the online application. You'll submit your documents, complete the approval process, and begin accepting trips once approved."
        ]
      },
      {
        question: "What are the driver requirements?",
        answer: [
          "Applicants must meet ChaufX's driver eligibility requirements, including holding a valid driver's licence and completing the required screening and approval process."
        ]
      },
      {
        question: "Do I need my own commercial vehicle?",
        answer: ["No. ChaufX drivers operate customers' vehicles, so you do not need to own a commercial vehicle to apply."]
      },
      {
        question: "Can I choose when I work?",
        answer: [
          "Yes. ChaufX is designed to provide flexibility, allowing approved drivers to accept trips that fit their availability."
        ]
      }
    ]
  },
  {
    title: "Support",
    items: [
      {
        question: "How do I contact ChaufX?",
        answer: ["You can reach our support team by phone, email, or through the Contact page on our website."]
      },
      {
        question: "What if I have an issue during my trip?",
        answer: [
          "If you experience an issue before, during, or after your booking, please contact ChaufX Support as soon as possible so we can assist you promptly."
        ]
      }
    ]
  }
];

export const featuredFaqs = [
  faqCategories[0].items[0],
  faqCategories[1].items[0],
  faqCategories[4].items[0],
  faqCategories[7].items[0],
  faqCategories[0].items[1],
  faqCategories[1].items[1],
  faqCategories[3].items[2],
  faqCategories[5].items[0]
];
