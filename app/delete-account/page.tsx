import { DriverContactForm } from "../../components/driver-contact-form";
import { PublicPageShell } from "../../components/public-page-shell";

const deletionTemplate = `Please delete my ChaufX account and associated personal data.

Account email:
Account type: Customer / Driver
Phone number:
Reason (optional):`;

export default function DeleteAccountPage() {
  return (
    <PublicPageShell
      heroTitle="Delete Account"
      heroCopy="Submit a deletion request for your ChaufX account and associated data."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.4fr_0.6fr]">
            <div className="rounded-[30px] border border-[#E5E7EB] bg-[#F8FAFC] p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Request deletion</h2>
              <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
                <p>Use this form to request removal of your ChaufX account and associated data.</p>
                <p>Include the email address used on the account so the team can verify the request.</p>
                <p>
                  Prefer email?{" "}
                  <a href="mailto:privacysupport@chaufx.ca" className="font-semibold text-[#2563EB]">
                    privacysupport@chaufx.ca
                  </a>
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Submit request</h2>
              <DriverContactForm
                defaultSubject="Account deletion request"
                buttonLabel="Open request form"
                source="account-deletion"
                initialOpen
                defaultMessage={deletionTemplate}
                messageLabel="Request details"
              />
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
