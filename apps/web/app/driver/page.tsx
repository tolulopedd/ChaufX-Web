import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

const driverBenefits = [
  {
    title: "Flexible Schedule",
    body: "Choose when you're available and accept trips that fit your schedule."
  },
  {
    title: "No Commercial Vehicle Required",
    body: "Our customers already have the vehicle. You provide the professional driving."
  },
  {
    title: "Professional Work",
    body: "Drive business professionals, families, seniors, airport travellers, and customers who value safe, reliable service."
  },
  {
    title: "Competitive Earnings",
    body: "Earn from your driving skills without the cost of owning or maintaining a commercial vehicle."
  },
  {
    title: "Built Around Respect",
    body: "We believe professional drivers deserve clear communication, fair treatment, and the support they need to do their job well."
  }
];

const goodFitItems = [
  "Professional",
  "Friendly and respectful",
  "Punctual",
  "A safe and confident driver",
  "Comfortable working independently",
  "Committed to providing a great customer experience"
];

const requirements = [
  "Hold a valid Canadian driver's licence.",
  "Have a clean driving record.",
  "Be legally eligible to work in Canada.",
  "Pass our screening process.",
  "Have good communication and customer service skills.",
  "Be comfortable driving different types of personal vehicles."
];

const processSteps = [
  {
    title: "Apply",
    body: "Complete the online application and submit the required information."
  },
  {
    title: "Get Verified",
    body: "Our team will review your application and complete the screening process."
  },
  {
    title: "Complete Onboarding",
    body: "Once approved, you'll receive onboarding information and be ready to start accepting trips."
  },
  {
    title: "Start Driving",
    body: "Accept trips that fit your availability and begin earning."
  }
];

const differenceItems = [
  "One day you might drive a business professional between meetings.",
  "Another day you might help a senior get to a medical appointment.",
  "You might take a family to the airport or help someone get home safely after an evening out.",
  "Your driving skills help people travel safely while staying in the comfort of their own vehicles."
];

const faqs = [
  {
    question: "Do I need my own vehicle?",
    answer: "No. ChaufX drivers operate the customer's own vehicle."
  },
  {
    question: "Can I choose when I work?",
    answer: "Yes. You decide when you're available and accept trips that fit your schedule."
  },
  {
    question: "Where will I drive?",
    answer: "We're currently recruiting drivers across the Greater Toronto Area (GTA)."
  },
  {
    question: "How do I get paid?",
    answer: "Approved drivers receive payment for completed trips. We'll explain the payment process during onboarding."
  },
  {
    question: "Will I receive training?",
    answer: "Yes. Every approved driver completes onboarding before accepting their first trip."
  },
  {
    question: "How long does the application process take?",
    answer: "Our team reviews every application carefully. We'll keep you updated throughout the process."
  }
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2563EB]">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A] md:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base md:leading-8">{body}</p> : null}
    </div>
  );
}

export default function BecomeDriverPage() {
  return (
    <PublicPageShell
      heroTitle="Turn Your Driving Skills Into Flexible Income"
      heroCopy="Drive customers in their own vehicles. Choose trips that fit your schedule. Join a growing community of professional drivers serving the Greater Toronto Area (GTA)."
      heroActions={
        <Link
          href="/driver/apply"
          className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-[1.875rem] py-[0.9375rem] text-[1.1rem] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.8)] transition hover:bg-[#1D4ED8]"
        >
          Apply to Become a Driver
        </Link>
      }
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)] md:p-9">
            <SectionHeading
              eyebrow="Drive Differently"
              title="At ChaufX, you don't need to own a commercial vehicle to earn from your driving skills."
            />
            <div className="mt-6 grid gap-4 text-sm leading-7 text-slate-600 md:grid-cols-2 md:text-base md:leading-8">
              <p>
                Instead of using your own car, you'll drive customers in the comfort of their own vehicles. Your role is simple. Help people get where they need to go safely, professionally, and on time.
              </p>
              <p>
                Whether you're looking for extra income or flexible work that fits your lifestyle, ChaufX gives you the opportunity to put your driving experience to work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F6F8FC]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <SectionHeading eyebrow="Why Drive with ChaufX?" title="Flexible work with a professional standard." />
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {driverBenefits.map((benefit) => (
              <div key={benefit.title} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_20px_64px_-50px_rgba(15,23,42,0.2)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB]">
                  <CheckIcon />
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-2">
          <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)] md:p-8">
            <SectionHeading
              eyebrow="Who We're Looking For"
              title="We're looking for people who enjoy driving and take pride in delivering excellent service."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {goodFitItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB]">
                    <CheckIcon />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#D7DEEF] bg-[#F8FAFC] p-7 md:p-8">
            <SectionHeading eyebrow="Driver Requirements" title="To apply, you should:" />
            <div className="mt-6 space-y-3">
              {requirements.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#2563EB]">
                    <CheckIcon />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Additional requirements may apply depending on your location and the services you provide.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#F6F8FC]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <SectionHeading eyebrow="How It Works" title="A clear path from application to approved trips." />
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step.title} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="rounded-[34px] bg-[#050B15] p-7 text-white shadow-[0_24px_80px_-54px_rgba(15,23,42,0.7)] md:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#60A5FA]">Make a Difference Every Day</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">Every trip is different.</h2>
            </div>
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {differenceItems.map((item) => (
                <div key={item} className="rounded-[24px] border border-white/10 bg-white/8 p-5 text-sm leading-7 text-white/78">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F6F8FC]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <SectionHeading eyebrow="Frequently Asked Questions" title="Driver questions, answered." />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-[26px] border border-[#E5E7EB] bg-white p-6">
                <h3 className="text-lg font-semibold tracking-[-0.04em] text-[#0F172A]">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="rounded-[34px] border border-[#D7DEEF] bg-[linear-gradient(135deg,#EEF2FF,#FFFFFF)] p-7 text-center md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2563EB]">Ready to Get Started?</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-[#0F172A] md:text-4xl">
              Join a growing community of professional drivers helping people travel safely in the comfort of their own vehicles.
            </h2>
            <Link
              href="/driver/apply"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_44px_-22px_rgba(37,99,235,0.75)] transition hover:bg-[#1D4ED8]"
            >
              Apply to Become a Driver
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
