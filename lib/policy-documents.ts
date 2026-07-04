export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyDocument = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  updatedLabel: string;
  effectiveLabel?: string;
  sections: PolicySection[];
};

export const policyDocuments: PolicyDocument[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary:
      "Learn how ChaufX collects, uses, discloses, and protects personal information across the website, customer app, driver app, and related services.",
    description:
      "This page contains the ChaufX privacy policy, including information collection, consent, retention, safeguards, cookies, breach notification, and privacy contact details.",
    updatedLabel: "Updated May 3, 2026",
    effectiveLabel: "Effective July 1, 2026",
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          "ChaufX Inc. explains in this policy how personal information is collected, used, disclosed, and protected in connection with the ChaufX website, customer app, driver app, and related services.",
          "The policy is intended to align with PIPEDA and applicable Canadian provincial privacy legislation, including Quebec Law 25 and the privacy statutes in British Columbia and Alberta.",
          "By using the services, users consent to the collection, use, and disclosure practices described in this policy."
        ]
      },
      {
        title: "2. Definitions",
        bullets: [
          "Customer: an individual who creates a customer account and uses the services to book driving or related assistance.",
          "Driver: an independent contractor engaged through the services to provide driving and related assistance.",
          "Personal Information: information about an identifiable individual, including contact details, booking data, device identifiers, geolocation, payment details, identity documents, and screening results.",
          "Sensitive Information: information that requires higher protection, including financial data, government-issued identification, SIN, criminal record information, health or mobility details, and precise geolocation.",
          "Consent: voluntary agreement to collection, use, and disclosure for identified purposes."
        ]
      },
      {
        title: "3. Information We Collect",
        bullets: [
          "Customer account information such as name, email, phone number, date of birth, booking details, vehicle details, communications, ratings, reviews, and uploaded photos.",
          "Driver onboarding information such as legal name, address, driver’s licence, driving abstract, insurance documents, identity documents, payout information, SIN for limited verification purposes, HST or GST registration number, headshot, and performance data.",
          "Automatic data such as device type, operating system, browser type, unique identifiers, usage data, IP address, approximate location, crash reports, and analytics information.",
          "Precise geolocation from the customer app during bookings and from the driver app while drivers are on duty, where device permission has been granted.",
          "Device permissions such as location, camera, photos or media library, push notifications, contacts where applicable, and microphone where in-app voice messaging is used."
        ]
      },
      {
        title: "4. Purposes for Collection",
        bullets: [
          "To provide, operate, maintain, and improve the services.",
          "To create and manage customer and driver accounts.",
          "To match customers with available drivers and support bookings and vehicle checks.",
          "To process payments, payouts, and taxes.",
          "To conduct background screening, identity verification, and driving abstract checks for drivers.",
          "To communicate transactional updates, support responses, safety alerts, and marketing where express consent has been given.",
          "To investigate incidents, prevent fraud, enforce platform rules, support analytics, and comply with legal obligations."
        ]
      },
      {
        title: "5. Consent",
        paragraphs: [
          "ChaufX obtains consent before or at the time personal information is collected. Consent may be express or implied depending on the context and the reasonable expectations of the user.",
          "Express consent is obtained before collecting, using, or disclosing sensitive information such as criminal record results, SIN, precise geolocation, and payment information, and before sending marketing communications under CASL.",
          "Users may withdraw consent at any time, subject to legal or contractual limits, though this may limit access to some or all services."
        ]
      },
      {
        title: "6. Limiting Collection",
        paragraphs: [
          "ChaufX limits collection to the information necessary for the identified purposes and collects personal information by fair and lawful means."
        ]
      },
      {
        title: "7. Use, Disclosure, and Retention",
        bullets: [
          "Personal information is used only for the purposes identified in the policy or for purposes a reasonable person would consider appropriate.",
          "Limited information is shared between customers and assigned drivers to enable a booking, such as first name, booking locations, instructions, driver photo, rating, and approximate location during the trip.",
          "Service providers may receive personal information where needed to support hosting, payments, background checks, identity verification, mapping, notifications, analytics, and support services.",
          "Information may also be disclosed to advisors, acquirers, courts, regulators, law enforcement, insurers, and others where permitted by law or where consent has been given.",
          "Indicative retention periods include up to seven years for account and booking records, up to two years after driver engagement for background check results, limited retention for SIN, and shorter retention for geolocation logs and support communications."
        ]
      },
      {
        title: "8. Safeguards",
        bullets: [
          "Encryption of data in transit and at rest.",
          "Secure cloud storage.",
          "Need-to-know access controls.",
          "Multi-factor authentication for administrative access.",
          "Contractual protections with service providers.",
          "Regular security assessments, monitoring, and a documented breach response process."
        ]
      },
      {
        title: "9. International Transfers",
        paragraphs: [
          "Personal information may be stored or processed in Canada, the United States, or other jurisdictions where ChaufX or its service providers operate. ChaufX takes steps to ensure transferred information remains protected in line with this policy and applicable law."
        ]
      },
      {
        title: "10. Accuracy, Access, Correction, Deletion, and Portability",
        bullets: [
          "Users may request access to the personal information held about them, subject to legal exceptions.",
          "Users may request corrections if information is inaccurate, incomplete, or out of date.",
          "Users may request deletion of an account and related information, subject to legal retention obligations and unresolved bookings or disputes.",
          "Where required by law, users may request a portable copy of information they provided in a structured, commonly used, machine-readable format."
        ]
      },
      {
        title: "11. Cookies and Similar Technologies",
        paragraphs: [
          "ChaufX uses cookies and similar technologies on the website to recognize devices, provide core features, analyze performance, personalize experiences, and support analytics. Users can manage preferences through browser settings, though disabling cookies may limit website functionality."
        ]
      },
      {
        title: "12. Children’s Privacy",
        paragraphs: [
          "The services are intended for users who are at least eighteen years old, or the age of majority where higher. ChaufX does not knowingly collect personal information from children and will delete such information if discovered."
        ]
      },
      {
        title: "13. Breach Notification",
        paragraphs: [
          "Where a security breach involving personal information creates a real risk of significant harm, ChaufX will notify the Office of the Privacy Commissioner of Canada, applicable provincial regulators where required, affected individuals as soon as feasible, and maintain legally required breach records."
        ]
      },
      {
        title: "14. Quebec Law 25 Disclosures",
        bullets: [
          "ChaufX has designated a person in charge of the protection of personal information.",
          "Privacy impact assessments are conducted for new technology projects where required.",
          "Eligible Quebec residents may request de-indexing of certain personal information links where Law 25 conditions are met.",
          "Complaints may be filed with the Commission d’accès à l’information du Québec."
        ]
      },
      {
        title: "15. Business Transfers",
        paragraphs: [
          "If ChaufX or substantially all of its assets are acquired, assigned, merged, financed, or otherwise transferred, personal information may be transferred as part of that transaction, subject to continued privacy protections."
        ]
      },
      {
        title: "16. Changes to the Privacy Policy",
        paragraphs: [
          "ChaufX may update the privacy policy to reflect changes in practices, technology, law, or operations. Material changes may be communicated on the website, through the services, or by email. Continued use after posting means acceptance of the revised policy."
        ]
      },
      {
        title: "17. Authorized Users and Account Sharing",
        paragraphs: [
          "Where an account holder adds an authorized user, the account holder represents that they have authority to do so and, where necessary, the authorized user’s consent. ChaufX relies on account holders to inform authorized users about how their information will be stored and handled."
        ]
      },
      {
        title: "18. Complaints and Contact",
        paragraphs: [
          "Privacy complaints may be submitted to ChaufX’s Privacy Officer. ChaufX will investigate and respond within a reasonable time. Users may also complain to the Office of the Privacy Commissioner of Canada and applicable provincial regulators."
        ],
        bullets: [
          "Address: ChaufX Inc., 2 Simcoe Street South, Suite 300, Oshawa, Ontario L1H 8C1",
          "Email: privacysupport@chaufx.ca",
          "Phone: +1 (647) 919-7237"
        ]
      }
    ]
  },
  {
    slug: "terms-and-conditions",
    title: "Terms and Conditions",
    summary:
      "Review the rules that govern access to the ChaufX website, customer app, bookings, memberships, payments, incident handling, and overall use of the platform.",
    description:
      "This page contains the ChaufX website and platform terms and conditions, including account use, booking rules, memberships, fees, insurance structure, acceptable use, and dispute provisions.",
    updatedLabel: "Updated May 3, 2026",
    effectiveLabel: "Effective July 1, 2026",
    sections: [
      {
        title: "1. Introduction and Acceptance",
        paragraphs: [
          "These terms govern access to and use of the ChaufX website, customer-facing mobile app, and related services. By creating an account, downloading or accessing the app, or otherwise using the services, users agree to be bound by the terms, privacy policy, and any additional referenced policies."
        ]
      },
      {
        title: "2. Changes to the Terms",
        paragraphs: [
          "ChaufX may update the terms from time to time. The effective date will be revised, and users may be notified through the services or by email. Continued use after changes take effect means the updated terms are accepted."
        ]
      },
      {
        title: "3. Key Definitions",
        bullets: [
          "Account: a registered customer account on the services.",
          "Authorized User: a family member, co-worker, or associate added to an account where that feature is available.",
          "Booking: a confirmed reservation for a driver to operate the customer’s vehicle during a specified period.",
          "Charges: all fees related to use of the services, including booking fees, membership fees, cancellation fees, no-show fees, tolls, parking, and other applicable charges.",
          "Service Credits: non-cash, non-transferable credits that may be applied to future ChaufX services where the feature is offered."
        ]
      },
      {
        title: "4. Nature of the Services",
        paragraphs: [
          "ChaufX operates as a technology marketplace connecting customers with independent drivers. ChaufX is not a taxi, ride-hailing, limousine, carrier, or transportation operator.",
          "Drivers operate the customer’s own vehicle. The customer remains responsible for ownership, possession, insurance, registration, roadworthiness, and legal compliance of the vehicle.",
          "ChaufX does not guarantee the availability, punctuality, or quality of a specific driver at a specific time."
        ]
      },
      {
        title: "5. Eligibility",
        paragraphs: [
          "Users must be at least eighteen years old, or the age of majority in their jurisdiction if higher, and must have legal capacity to enter into a binding agreement. The services are unavailable to users whose accounts were previously suspended, deactivated, or terminated."
        ]
      },
      {
        title: "6. Account Registration and Security",
        bullets: [
          "Users must provide accurate, current, and complete account information and keep it up to date.",
          "Only one active account may be used unless otherwise permitted.",
          "Users are responsible for protecting login credentials and for all activity under their account.",
          "Unauthorized access or misuse must be reported immediately."
        ]
      },
      {
        title: "7. Authorized Users and Account Sharing",
        bullets: [
          "Basic accounts do not include additional authorized users.",
          "Plus memberships may include up to three additional household family members, for a total of four people.",
          "Concierge memberships may include up to four additional family members, co-workers, or associates, for a total of five people.",
          "Corporate memberships follow the applicable corporate membership agreement.",
          "ChaufX may require each authorized user to create and accept their own account terms."
        ]
      },
      {
        title: "8. Membership Tiers, Billing, and Charges",
        bullets: [
          "Basic membership is transactional with no monthly fee and published booking rates.",
          "Plus membership is $100 monthly or $999 yearly and includes reduced hourly booking rates and expanded account access.",
          "Concierge membership is $200 monthly or $2,199 yearly and includes reduced hourly rates and concierge-level support.",
          "Corporate membership uses custom pricing under a separate agreement.",
          "Where offered, a fourteen-day free trial applies to Plus and Concierge memberships before membership fees begin.",
          "Memberships auto-renew until cancelled, and ChaufX may charge membership fees and booking-related charges to the payment methods on file.",
          "Membership fees are non-refundable once charged. Price changes may be made on at least thirty days’ written notice."
        ]
      },
      {
        title: "9. Customer Obligations and Vehicle Ownership",
        bullets: [
          "Customers represent that they own or lawfully possess the vehicle and may authorize a third-party driver to operate it.",
          "The vehicle must be roadworthy, legally registered, plated, and insured in accordance with applicable law.",
          "Insurance must permit a third-party driver engaged through a platform like ChaufX to operate the vehicle.",
          "Customers must treat drivers respectfully, avoid unsafe or unlawful conduct, avoid dangerous or illegal cargo, and complete pre-trip and post-trip vehicle condition checks."
        ]
      },
      {
        title: "10. Advance Booking, Cancellation, and No-Show Policy",
        bullets: [
          "Standard bookings require at least two hours’ advance notice.",
          "Overnight or multi-day bookings require at least seventy-two hours’ advance notice.",
          "Standard bookings cancelled with less than one hour’s notice are subject to a 50% cancellation fee.",
          "Overnight or multi-day bookings cancelled with less than forty-eight hours’ notice are also subject to a 50% cancellation fee.",
          "If the customer has not made contact within forty-five minutes after pickup time, the booking may be treated as a no-show and charged a 50% no-show fee."
        ]
      },
      {
        title: "11. Driver Status and Right to Decline",
        paragraphs: [
          "Drivers are independent contractors who are vetted before onboarding. ChaufX may suspend, remove, or decline to engage drivers for safety, regulatory, or quality reasons.",
          "Drivers may refuse to start or continue a booking where the situation appears unsafe, unlawful, or non-compliant, including intoxication, violent behaviour, unsafe vehicles, or dangerous cargo."
        ]
      },
      {
        title: "12. Insurance and Service Credits",
        bullets: [
          "The customer’s automobile insurance is the primary insurance for claims arising from operation of the vehicle during a booking.",
          "Drivers must maintain the licence and insurance coverage required under the driver agreement.",
          "ChaufX maintains a commercial general liability policy with non-owned auto coverage that is intended to apply secondarily and only where eligible claims exceed applicable primary coverage, subject to the insurer’s terms and exclusions.",
          "Where a driver is determined to be at fault and the customer provides concrete evidence within thirty days, ChaufX may issue non-cash service credits toward future services.",
          "Service credit caps differ by membership level and are not admissions of liability.",
          "Rental vehicle bookings require the assigned driver to be listed as an authorized driver on the rental contract before service begins."
        ]
      },
      {
        title: "13. No Off-Platform Solicitation",
        paragraphs: [
          "Customers may not solicit, arrange, or accept transportation or related services outside the ChaufX platform with a driver they were matched with through the platform, without prior written consent from ChaufX, during use of the services and for twelve months after the last booking."
        ]
      },
      {
        title: "14. Communications",
        paragraphs: [
          "Transactional communications related to bookings, accounts, and service operations may be sent without additional marketing consent where exempt under CASL. Marketing messages are sent only where express consent has been provided and may be unsubscribed from at any time."
        ]
      },
      {
        title: "15. Acceptable Use",
        bullets: [
          "Do not use the services unlawfully or in breach of applicable law.",
          "Do not provide an uninsured, unregistered, or unroadworthy vehicle.",
          "Do not transport unlawful, dangerous, or hazardous goods.",
          "Do not harass, threaten, discriminate against, or abuse drivers or other users.",
          "Do not impersonate another person, scrape data, bypass security, reverse engineer the platform, or use personal information of others improperly."
        ]
      },
      {
        title: "16 to 22. Intellectual Property, User Content, Risk, Disclaimers, Liability, and Indemnity",
        bullets: [
          "ChaufX and its licensors own the intellectual property rights in the platform, brand, and related content.",
          "Users retain ownership of user content they submit, but grant ChaufX a licence to use that content to operate, maintain, and improve the services and respond to disputes or safety issues.",
          "Users assume the inherent risks of motor vehicle travel and remain responsible for ensuring their vehicle is insured and in safe legal condition.",
          "The services are provided on an as-is and as-available basis, subject to applicable non-waivable rights.",
          "ChaufX limits its liability to the maximum extent permitted by law, including a general cap based on amounts paid in the previous twelve months or CAD $100, whichever is greater.",
          "Users agree to indemnify ChaufX for claims arising from misuse of the services, breaches of the terms, vehicle non-compliance, insurer disputes, user content, or legal violations."
        ]
      },
      {
        title: "23 to 31. Reporting, Suspension, Privacy, Governing Law, and Contact",
        bullets: [
          "Accidents, collisions, near-misses, damage, injury, or other safety incidents must be reported promptly, and customers must cooperate with investigations and insurers.",
          "ChaufX may suspend or terminate accounts for breaches, fraud, unlawful conduct, inaccurate information, or conduct that creates harm or liability risk.",
          "Use of the services is also governed by the privacy policy.",
          "Ontario law governs the terms, subject to applicable consumer protection rights.",
          "Users should provide written notice of disputes and engage in good-faith discussions before legal proceedings unless urgent court relief is needed.",
          "Questions about the terms may be directed to info@chaufx.ca or by mail to ChaufX at 2 Simcoe Street South, Suite 300, Oshawa, Ontario L1H 8C1."
        ]
      }
    ]
  },
  {
    slug: "driver-contractor-agreement",
    title: "Independent Contractor Agreement (Driver)",
    summary:
      "Read the driver agreement covering contractor status, driver qualifications, safety and insurance obligations, compensation, background checks, termination, and dispute processes.",
    description:
      "This page contains the ChaufX independent contractor agreement for drivers, including services, fees, insurance obligations, platform rules, confidentiality, indemnities, and background screening terms.",
    updatedLabel: "Updated May 14, 2026",
    sections: [
      {
        title: "Agreement Overview",
        paragraphs: [
          "This independent contractor agreement is between ChaufX Inc. and the driver contractor. It confirms that ChaufX operates a platform connecting customers seeking professional drivers with independent contractors who operate the customer’s own vehicle.",
          "The agreement takes effect as of the date of the final signature and is supported by Schedule A for services, fees, and compensation and Schedule B for background check consent."
        ]
      },
      {
        title: "1. Services",
        bullets: [
          "The contractor provides the driving and related assistance services listed in Schedule A.",
          "The contractor may not subcontract services or use a substitute driver.",
          "The contractor decides how to perform the work, subject to law, customer route preferences, and platform safety standards.",
          "The contractor supplies their own smartphone, data plan, and tools needed to access the platform.",
          "The contractor may accept or decline bookings freely and is not required to accept a minimum number of bookings or hours."
        ]
      },
      {
        title: "2. Independent Contractor Status",
        bullets: [
          "The contractor remains an independent contractor and not an employee, dependent contractor, agent, partner, or fiduciary of ChaufX.",
          "The relationship is non-exclusive, and the contractor may work for third parties, including competitors, provided there is no conflict with specific bookings.",
          "The contractor is not eligible for employee benefits from ChaufX.",
          "The contractor is responsible for their own taxes, payroll obligations, registrations, remittances, and related compliance.",
          "The contractor must monitor GST or HST thresholds and register when required, then notify ChaufX promptly."
        ]
      },
      {
        title: "3. Eligibility and Qualifications",
        bullets: [
          "Drivers must hold a valid full-privilege provincial licence in good standing.",
          "Drivers must be at least twenty-three years old under ChaufX underwriting criteria.",
          "Drivers must have at least three years of driving experience in Canada or an equivalent jurisdiction.",
          "Drivers must maintain a clean driving abstract within platform policy thresholds.",
          "Drivers must be legally authorized to work in Canada and comply with applicable laws.",
          "Drivers must immediately notify ChaufX of licence suspensions, criminal charges, insurance lapses, or other changes affecting eligibility."
        ]
      },
      {
        title: "4. Vehicle, Insurance, and Safety Requirements",
        bullets: [
          "Bookings are performed in the customer’s vehicle, and the customer’s insurance is primary for operation of that vehicle during the booking.",
          "Drivers must decline or stop a booking if a vehicle appears unsafe, uninsured, unregistered, or otherwise non-compliant.",
          "Drivers must maintain personal automobile insurance, including at least CAD $2,000,000 in third-party liability coverage and a non-owned automobile endorsement such as OPCF 27 or equivalent.",
          "Drivers must provide proof of insurance and updated driving documents during onboarding and when reasonably requested.",
          "Drivers must obey traffic laws, avoid impairment, avoid handheld device use while driving, complete vehicle checks, act professionally, and report incidents immediately.",
          "Senior assistance is limited to incidental, non-medical assistance and does not include medication administration or regulated health services."
        ]
      },
      {
        title: "5 and 6. Compensation and Membership-Tier Acknowledgements",
        bullets: [
          "Driver fees and commission rules are set out in Schedule A.",
          "ChaufX keeps a platform commission from the customer’s payment before transferring the remaining amount to the contractor.",
          "Drivers bear their own performance expenses unless a cost is expressly approved or passed through under platform policy.",
          "Reasonable booking-related tolls, parking, and similar pass-through expenses may be charged as allowed by platform policy.",
          "Per-booking rates, minimum durations, and service expectations may vary by membership tier and are accepted when the driver accepts the booking."
        ]
      },
      {
        title: "7 to 9. Service Credits, Platform Insurance, and Rental Vehicles",
        bullets: [
          "Where a customer alleges driver fault, ChaufX may investigate and determine fault for internal service credit purposes only.",
          "Any platform-level commercial or umbrella policy is intended to apply secondarily after the customer’s and driver’s own insurance where eligible, and does not replace the driver’s obligation to maintain coverage.",
          "Rental vehicle bookings may only proceed where the driver is listed as an authorized driver and required rental information has been recorded through the platform."
        ]
      },
      {
        title: "10. No Off-Platform Solicitation",
        paragraphs: [
          "During the term of the agreement and for twelve months after it ends, the contractor may not solicit, arrange, accept, or perform off-platform services for customers they were matched with through the ChaufX platform, unless ChaufX gives prior written consent."
        ]
      },
      {
        title: "11 and 12. Background Checks, Privacy, and Confidentiality",
        bullets: [
          "Drivers must complete required background checks, identity verification, right-to-work verification, and driving abstract checks.",
          "Background screening is supported by Schedule B consent and may be repeated during the engagement where permitted by law.",
          "Drivers must protect ChaufX confidential information and customer personal information and may use it only as needed to perform bookings.",
          "Confidential information must be returned or destroyed when the relationship ends or when requested."
        ]
      },
      {
        title: "13 to 15. Intellectual Property, Representations, Indemnity, and Liability",
        bullets: [
          "ChaufX retains ownership of the platform, branding, and related intellectual property.",
          "Drivers represent that they can lawfully enter the agreement, meet the qualification requirements, and will perform services professionally and lawfully.",
          "Drivers indemnify ChaufX for losses arising from their acts or omissions, breaches, legal violations, insurer claims, privacy breaches, and other specified issues.",
          "ChaufX’s liability to the contractor is capped, to the maximum extent permitted by law, at the fees actually paid to the contractor in the prior six months, subject to exceptions such as payment of undisputed fees."
        ]
      },
      {
        title: "16 to 19. Termination, Non-Solicitation of Personnel, Dispute Resolution, and General Terms",
        bullets: [
          "Either party may terminate without cause on fourteen days’ written notice, or longer where required by law.",
          "ChaufX may suspend or terminate immediately for cause, including safety risks, fraud, licence or insurance issues, criminal matters affecting eligibility, adverse background check findings, or material breach.",
          "Certain obligations survive termination, including confidentiality, indemnities, non-solicitation, dispute resolution, and related legal protections.",
          "Disputes first go through good-faith negotiation, then confidential arbitration in Toronto, Ontario, subject to stated carve-outs such as urgent injunctive relief or small claims court matters.",
          "The agreement is governed by Ontario law and includes clauses for notices, severability, force majeure, language, electronic signatures, and entire agreement."
        ]
      },
      {
        title: "Schedule A. Services, Fees, and Compensation",
        bullets: [
          "Services may include personal driving, event driving, designated driver services, senior assistance driving, wait-and-return driving, airport transfers, and other services introduced on the platform.",
          "Placeholder onboarding rates include personal driving at $29 per hour with a two-hour minimum, senior assistance driving at $39 per hour with a two-hour minimum, airport transfers at $29 within the defined service area, and specified overnight or late-night pricing.",
          "ChaufX retains a 30% platform commission on the gross booking fee, excluding taxes, gratuities, and pass-through expenses.",
          "Driver payouts are calculated weekly and generally paid within three business days after the end of each payout period.",
          "Fee disputes must be raised within ninety days of the applicable statement unless fraud or manifest error applies."
        ]
      },
      {
        title: "Schedule B. Background Check Consent and Authorization",
        bullets: [
          "Background screening may include criminal record checks, vulnerable sector checks where applicable, driving abstract reviews, identity verification, right-to-work verification, and residence history verification.",
          "By signing the schedule, the contractor authorizes ChaufX and designated screening providers to collect, use, and disclose personal information for these purposes.",
          "Drivers have rights to be informed of adverse decisions, request copies of reports, dispute accuracy with the provider, and withdraw consent, though withdrawal may affect onboarding or ongoing engagement.",
          "Collected information must be handled in line with the ChaufX privacy policy and applicable law."
        ]
      }
    ]
  }
];

export function getPolicyDocument(slug: string) {
  return policyDocuments.find((document) => document.slug === slug);
}
