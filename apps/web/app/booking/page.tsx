import { PublicPageShell } from "../../components/public-page-shell";
import { GuestBookingForm } from "./guest-booking-form";

export default function BookingPage() {
  return (
    <PublicPageShell
      heroTitle="Book a driver"
      heroCopy="Book now or schedule a trip in your own vehicle."
    >
      <GuestBookingForm />
    </PublicPageShell>
  );
}
