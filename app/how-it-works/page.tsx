import { PublicPageShell } from "../../components/public-page-shell";

const customerSteps = [
  {
    title: "Tell us where you're going.",
    body: "Enter your pickup location, destination, and preferred time."
  },
  {
    title: "Get matched with a professional driver.",
    body: "An approved driver accepts your booking."
  },
  {
    title: "Enjoy the ride.",
    body: "Relax, work, or spend time with family while your professional driver takes the wheel."
  }
];

const driverSteps = [
  "Submit your application and upload your onboarding details.",
  "Wait for review and approval from the ChaufX admin team.",
  "Use your login to access the driver web and mobile experience."
];

export default function HowItWorksPage() {
  return (
    <PublicPageShell
      heroTitle="How It Works"
      heroCopy="ChaufX keeps the booking journey simple for customers and the onboarding journey clear for chauffeurs."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div id="customer-journey" className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Customer journey</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Book in a few clear steps.</h2>
              <div className="mt-6 space-y-4">
                {customerSteps.map((item, index) => (
                  <div key={item.title} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Step {index + 1}</div>
                    <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-[#0F172A]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="driver-onboarding" className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Driver onboarding</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Join the network with clear review steps.</h2>
              <div className="mt-6 space-y-4">
                {driverSteps.map((item, index) => (
                  <div key={item} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Step {index + 1}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
