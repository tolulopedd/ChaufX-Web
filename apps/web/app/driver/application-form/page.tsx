"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicPageShell } from "../../../components/public-page-shell";
import { driverApply, fetchDriverApplicationUpdate } from "../../../lib/api";

const provincesAndTerritories = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon"
] as const;

const licenceClassesByJurisdiction: Record<(typeof provincesAndTerritories)[number], string[]> = {
  Alberta: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"],
  "British Columbia": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"],
  Manitoba: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
  "New Brunswick": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9"],
  "Newfoundland and Labrador": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"],
  "Northwest Territories": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"],
  "Nova Scotia": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"],
  Nunavut: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"],
  Ontario: ["Class A", "Class B", "Class C", "Class D", "Class E", "Class F", "Class G", "Class G1", "Class G2", "Class M", "Class M1", "Class M2"],
  "Prince Edward Island": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"],
  Quebec: ["Class 1", "Class 2", "Class 3", "Class 4A", "Class 4B", "Class 4C", "Class 5", "Class 6A", "Class 6B", "Class 6C", "Class 6D", "Class 6E", "Class 8"],
  Saskatchewan: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"],
  Yukon: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"]
};

const experienceMap: Record<string, number> = {
  "2-3": 2,
  "3-5": 4,
  "5-10": 7,
  "10+": 10
};

const uploadAccept = ".pdf,.png,.jpg,.jpeg,.webp";
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function formatCanadianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.startsWith("1") ? digits.slice(1, 11) : digits.slice(0, 10);

  if (!localNumber) {
    return "";
  }
  if (localNumber.length <= 3) {
    return `+1 (${localNumber}`;
  }
  if (localNumber.length <= 6) {
    return `+1 (${localNumber.slice(0, 3)}) ${localNumber.slice(3)}`;
  }

  return `+1 (${localNumber.slice(0, 3)}) ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
}

function formatCanadianPostalCode(value: string) {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  return characters.length > 3 ? `${characters.slice(0, 3)} ${characters.slice(3)}` : characters;
}

function scheduleValue(schedule: string | null | undefined, label: string) {
  const line = String(schedule ?? "").split("\n").find((item) => item.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function scheduleList(schedule: string | null | undefined, label: string) {
  const value = scheduleValue(schedule, label);
  return value && value !== "Not provided" ? value.split(", ").filter(Boolean) : [];
}

function experienceBandForYears(years: number) {
  if (years >= 10) return "10+";
  if (years >= 5) return "5-10";
  if (years >= 3) return "3-5";
  return "2-3";
}

type DocumentUploadKey =
  | "driverLicenseFront"
  | "driverLicenseBack"
  | "proofOfInsurance"
  | "workAuthorization"
  | "healthTrainingCertificate"
  | "signature";

type AddressSuggestion = {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  postalCode: string;
};

const requiredUploadFields: DocumentUploadKey[] = [
  "driverLicenseFront",
  "driverLicenseBack",
  "proofOfInsurance"
];

const documentUploadFields: Array<{
  label: string;
  key: DocumentUploadKey;
  required: boolean;
}> = [
  { label: "* Valid Driver’s License (Front page)", key: "driverLicenseFront", required: true },
  { label: "* Valid Driver’s License (Back page)", key: "driverLicenseBack", required: true },
  { label: "* Proof of Insurance", key: "proofOfInsurance", required: true },
  { label: "Proof of Work Authorization (For Canadian temporary residents)", key: "workAuthorization", required: false },
  { label: "First Aid / CPR / PSW / Health or emergency training certificate", key: "healthTrainingCertificate", required: false }
];

const documentFileLabels: Record<DocumentUploadKey, string> = {
  driverLicenseFront: "Driver license - front",
  driverLicenseBack: "Driver license - back",
  proofOfInsurance: "Proof of insurance",
  workAuthorization: "Proof of work authorization",
  healthTrainingCertificate: "Health or emergency training certificate",
  signature: "Signature"
};

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected file."));
    };

    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function extractContextText(context: any[] | undefined, prefix: string) {
  const match = Array.isArray(context) ? context.find((entry) => String(entry?.id ?? "").startsWith(prefix)) : null;
  return typeof match?.text === "string" ? match.text : "";
}

function mapFeatureToSuggestion(feature: any): AddressSuggestion | null {
  if (!feature || !Array.isArray(feature.center) || feature.center.length < 2) {
    return null;
  }

  const city =
    extractContextText(feature.context, "place.") ||
    extractContextText(feature.context, "locality.") ||
    extractContextText(feature.context, "district.");
  const postalCode = extractContextText(feature.context, "postcode.");

  return {
    id: String(feature.id),
    label: String(feature.place_name ?? feature.text ?? ""),
    addressLine: String(feature.address ? `${feature.address} ${feature.text ?? ""}`.trim() : feature.text ?? feature.place_name ?? ""),
    city,
    postalCode
  };
}

async function searchCanadianAddresses(query: string) {
  if (!mapboxToken || query.trim().length < 3) {
    return [] as AddressSuggestion[];
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    limit: "5",
    language: "en",
    country: "ca",
    types: "address,place,postcode"
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Unable to load address suggestions right now.");
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features.map(mapFeatureToSuggestion).filter((item: AddressSuggestion | null): item is AddressSuggestion => Boolean(item));
}

function DriverApplicationFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [applicationUpdateReady, setApplicationUpdateReady] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [existingDocuments, setExistingDocuments] = useState<Array<{ id: string; fileName: string; type: string }>>([]);
  const [replaceDocumentIds, setReplaceDocumentIds] = useState<Record<DocumentUploadKey, string | null>>({
    driverLicenseFront: null,
    driverLicenseBack: null,
    proofOfInsurance: null,
    workAuthorization: null,
    healthTrainingCertificate: null,
    signature: null
  });
  const [additionalReplacementFiles, setAdditionalReplacementFiles] = useState<Record<string, File | null>>({});
  const applicationUpdateToken = searchParams.get("updateToken") ?? "";
  const suppressAddressSearchRef = useRef(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<DocumentUploadKey, File | null>>({
    driverLicenseFront: null,
    driverLicenseBack: null,
    proofOfInsurance: null,
    workAuthorization: null,
    healthTrainingCertificate: null,
    signature: null
  });
  const [form, setForm] = useState({
    verificationToken: searchParams.get("verificationToken") ?? "",
    firstName: searchParams.get("firstName") ?? "",
    lastName: searchParams.get("lastName") ?? "",
    phone: formatCanadianPhoneNumber(searchParams.get("phone") ?? ""),
    email: searchParams.get("email") ?? "",
    dateOfBirth: "",
    address: "",
    city: "",
    postalCode: "",
    workAuthorized: "yes",
    licenseNumber: "",
    provinceOfIssue: "",
    licenseClass: "",
    licenseExpiryDate: "",
    experienceBand: "2-3",
    trafficViolations: "no",
    trafficViolationsNotes: "",
    licenseSuspensions: "no",
    licenseSuspensionsNotes: "",
    atFaultAccidents: "no",
    atFaultAccidentsNotes: "",
    duiHistory: "no",
    duiHistoryNotes: "",
    professionalExperience: [] as string[],
    previousEmployer: "no",
    employerName: "",
    employmentStartDate: "",
    employmentEndDate: "",
    currentlyWorkingThere: false,
    employerRole: "",
    employerProvince: "",
    employerCountry: "Canada",
    preferredWorkingHours: [] as string[],
    weeklyAvailability: "Flexible",
    serviceCapability: [] as string[],
    healthEmergencyTraining: "no",
    healthEmergencyTrainingDetails: "",
    ownVehicle: "no",
    criminalConsent: true,
    driverRecordConsent: true,
    identityConsent: true,
    professionalStandards: true,
    signatureName: "",
    applicantResponse: "",
    applicationDate: new Date().toISOString().slice(0, 10),
    serviceProvince: ""
  });

  useEffect(() => {
    if (!applicationUpdateToken) {
      setApplicationUpdateReady(true);
      return;
    }

    let cancelled = false;
    setUpdateLoading(true);
    setApplicationUpdateReady(false);
    setError("");

    void fetchDriverApplicationUpdate(applicationUpdateToken)
      .then((application) => {
        if (cancelled) return;

        const [firstName = "", ...lastNameParts] = application.fullName.trim().split(/\s+/);
        const addressParts = application.address.split(",").map((item) => item.trim()).filter(Boolean);
        const postalCode = addressParts.at(-1) ?? "";
        const city = addressParts.length >= 2 ? addressParts.at(-2) ?? "" : "";
        const address = addressParts.length >= 3 ? addressParts.slice(0, -2).join(", ") : application.address;
        const schedule = application.availabilitySchedule;
        const cityPostal = scheduleValue(schedule, "City / postal code").split("/").map((item) => item.trim());
        const previousEmployer = scheduleValue(schedule, "Previous employer");
        const employerParts = previousEmployer && previousEmployer !== "No" ? previousEmployer.split(" | ") : [];

        setSelectedAddressId("saved-application-address");
        setAdminComment(application.reviewNote ?? "");
        setExistingDocuments(application.documents);
        setApplicationUpdateReady(true);
        setForm((current) => ({
          ...current,
          firstName,
          lastName: lastNameParts.join(" "),
          phone: formatCanadianPhoneNumber(application.phone),
          email: application.email,
          address,
          city: cityPostal[0] && cityPostal[0] !== "Not provided" ? cityPostal[0] : city,
          postalCode: formatCanadianPostalCode(cityPostal[1] && cityPostal[1] !== "Not provided" ? cityPostal[1] : postalCode),
          dateOfBirth: scheduleValue(schedule, "Date of birth") === "Not provided" ? "" : scheduleValue(schedule, "Date of birth"),
          workAuthorized: scheduleValue(schedule, "Legally authorized to work in Canada") || current.workAuthorized,
          licenseNumber: application.licenseNumber,
          provinceOfIssue: scheduleValue(schedule, "Province of issue"),
          licenseClass: scheduleValue(schedule, "License class"),
          licenseExpiryDate: scheduleValue(schedule, "License expiry date") === "Not provided" ? "" : scheduleValue(schedule, "License expiry date"),
          experienceBand: experienceBandForYears(application.yearsOfExperience),
          trafficViolations: scheduleValue(schedule, "Traffic violations") === "No" ? "no" : "yes",
          trafficViolationsNotes: scheduleValue(schedule, "Traffic violations") === "No" ? "" : scheduleValue(schedule, "Traffic violations"),
          licenseSuspensions: scheduleValue(schedule, "License suspensions") === "No" ? "no" : "yes",
          licenseSuspensionsNotes: scheduleValue(schedule, "License suspensions") === "No" ? "" : scheduleValue(schedule, "License suspensions"),
          atFaultAccidents: scheduleValue(schedule, "At-fault accidents") === "No" ? "no" : "yes",
          atFaultAccidentsNotes: scheduleValue(schedule, "At-fault accidents") === "No" ? "" : scheduleValue(schedule, "At-fault accidents"),
          duiHistory: scheduleValue(schedule, "DUI / impaired driving") === "No" ? "no" : "yes",
          duiHistoryNotes: scheduleValue(schedule, "DUI / impaired driving") === "No" ? "" : scheduleValue(schedule, "DUI / impaired driving"),
          professionalExperience: scheduleList(schedule, "Professional experience"),
          previousEmployer: employerParts.length ? "yes" : "no",
          employerName: employerParts[0] === "Not provided" ? "" : employerParts[0] ?? "",
          employerRole: employerParts[1] === "Not provided" ? "" : employerParts[1] ?? "",
          preferredWorkingHours: scheduleList(schedule, "Preferred working hours"),
          weeklyAvailability: scheduleValue(schedule, "Availability per week") || current.weeklyAvailability,
          serviceCapability: scheduleList(schedule, "Service capability"),
          ownVehicle: scheduleValue(schedule, "Owns a vehicle") || current.ownVehicle,
          signatureName: scheduleValue(schedule, "Signature").startsWith("Uploaded -") ? "" : scheduleValue(schedule, "Signature"),
          serviceProvince: application.preferredServiceAreas[0] ?? ""
        }));
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load application update.");
      })
      .finally(() => {
        if (!cancelled) setUpdateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationUpdateToken]);

  const professionalExperienceOptions = useMemo(
    () => ["None", "Chauffeur Service", "Ride-share driving", "Delivery driving", "Corporate driving", "Customer service roles"],
    []
  );
  const workingHourOptions = useMemo(() => ["Weekdays", "Weekends", "Daytime", "Evening", "Late Night"], []);
  const serviceCapabilityOptions = useMemo(
    () => [
      "Drive client's personal vehicle",
      "Senior / assisted transportation",
      "Wait-and-return services",
      "Event / late-night driving",
      "Long-distance driving"
    ],
    []
  );

  useEffect(() => {
    if (suppressAddressSearchRef.current) {
      suppressAddressSearchRef.current = false;
      return;
    }

    if (!mapboxToken || form.address.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setAddressSearching(true);

      try {
        const suggestions = await searchCanadianAddresses(form.address);
        if (!cancelled) {
          setAddressSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setAddressSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.address]);

  function applyAddressSuggestion(suggestion: AddressSuggestion) {
    suppressAddressSearchRef.current = true;
    setSelectedAddressId(suggestion.id);
    setForm((current) => ({
      ...current,
      address: suggestion.addressLine || suggestion.label,
      city: suggestion.city || current.city,
      postalCode: current.postalCode
    }));
    setAddressSuggestions([]);
  }

  function existingDocumentFor(key: DocumentUploadKey) {
    const label = documentFileLabels[key];
    return existingDocuments.find((document) => document.fileName.startsWith(`${label} - `));
  }

  function selectDocument(key: DocumentUploadKey, file: File | null) {
    setUploadedFiles((current) => ({ ...current, [key]: file }));
    setReplaceDocumentIds((current) => ({
      ...current,
      [key]: file ? existingDocumentFor(key)?.id ?? null : null
    }));
  }

  const unmatchedExistingDocuments = existingDocuments.filter(
    (document) => !Object.values(documentFileLabels).some((label) => document.fileName.startsWith(`${label} - `))
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (applicationUpdateToken && !applicationUpdateReady) {
      setError("This application update link is invalid or has expired.");
      setLoading(false);
      return;
    }

    if (mapboxToken && !selectedAddressId) {
      setError("Select your home address from the Mapbox suggestions.");
      setLoading(false);
      return;
    }

    const missingDocuments = requiredUploadFields.filter((key) => !uploadedFiles[key]);

    if (!applicationUpdateToken && missingDocuments.length > 0) {
      setError("Please upload all required documents before submitting your application.");
      setLoading(false);
      return;
    }

    if (!applicationUpdateToken && !uploadedFiles.signature && !form.signatureName.trim()) {
      setError("Please upload your signature or type your full name as your signature before submitting.");
      setLoading(false);
      return;
    }

    if (!applicationUpdateToken && form.healthEmergencyTraining === "yes" && !uploadedFiles.healthTrainingCertificate) {
      setError("Please upload your training certificate before submitting your application.");
      setLoading(false);
      return;
    }

    const notes = [
      `Date of birth: ${form.dateOfBirth || "Not provided"}`,
      `City / postal code: ${form.city || "Not provided"} / ${form.postalCode || "Not provided"}`,
      `Legally authorized to work in Canada: ${form.workAuthorized}`,
      `Province of issue: ${form.provinceOfIssue}`,
      `License class: ${form.licenseClass}`,
      `License expiry date: ${form.licenseExpiryDate || "Not provided"}`,
      `Traffic violations: ${form.trafficViolations === "yes" ? form.trafficViolationsNotes || "Yes" : "No"}`,
      `License suspensions: ${form.licenseSuspensions === "yes" ? form.licenseSuspensionsNotes || "Yes" : "No"}`,
      `At-fault accidents: ${form.atFaultAccidents === "yes" ? form.atFaultAccidentsNotes || "Yes" : "No"}`,
      `DUI / impaired driving: ${form.duiHistory === "yes" ? form.duiHistoryNotes || "Yes" : "No"}`,
      `Professional experience: ${form.professionalExperience.join(", ") || "Not provided"}`,
      `Previous employer: ${
        form.previousEmployer === "yes"
          ? `${form.employerName || "Not provided"} | ${form.employerRole || "Not provided"} | ${form.employerProvince || "Not provided"}, ${form.employerCountry || "Not provided"} | ${form.employmentStartDate || "Not provided"} to ${form.currentlyWorkingThere ? "Present" : form.employmentEndDate || "Not provided"}`
          : "No"
      }`,
      `Preferred working hours: ${form.preferredWorkingHours.join(", ") || "Not provided"}`,
      `Availability per week: ${form.weeklyAvailability}`,
      `Service capability: ${form.serviceCapability.join(", ") || "Not provided"}`,
      `Proof of work authorization: ${uploadedFiles.workAuthorization ? `Uploaded - ${uploadedFiles.workAuthorization.name}` : "Not provided"}`,
      `Health / emergency training: ${
        form.healthEmergencyTraining === "yes"
          ? `${form.healthEmergencyTrainingDetails || "Yes"} | Certificate: ${uploadedFiles.healthTrainingCertificate ? uploadedFiles.healthTrainingCertificate.name : "Not uploaded"}`
          : "No"
      }`,
      `Owns a vehicle: ${form.ownVehicle}`,
      `Consents - criminal: ${form.criminalConsent ? "Yes" : "No"}, driver record: ${form.driverRecordConsent ? "Yes" : "No"}, identity: ${form.identityConsent ? "Yes" : "No"}`,
      `Professional standards acknowledged: ${form.professionalStandards ? "Yes" : "No"}`,
      `Signature: ${uploadedFiles.signature ? `Uploaded - ${uploadedFiles.signature.name}` : form.signatureName || "Not provided"}`,
      `Application date: ${form.applicationDate || "Not provided"}`
    ].join("\n");

    try {
      const additionalDocuments = Object.entries(additionalReplacementFiles).flatMap(([documentId, file]) =>
        file ? [{ documentId, file }] : []
      );
      const documents = await Promise.all(
        [
          ["DRIVER_LICENSE", "Driver license - front", uploadedFiles.driverLicenseFront],
          ["DRIVER_LICENSE", "Driver license - back", uploadedFiles.driverLicenseBack],
          ["OTHER", "Proof of insurance", uploadedFiles.proofOfInsurance],
          ["OTHER", "Proof of work authorization", uploadedFiles.workAuthorization],
          ["OTHER", "Health or emergency training certificate", uploadedFiles.healthTrainingCertificate],
          ["OTHER", "Signature", uploadedFiles.signature]
        ]
          .filter(([, , file]) => file)
          .map(async ([type, label, file]) => {
            const uploadedFile = file as File;

            return {
              type,
              fileName: `${label} - ${uploadedFile.name}`,
              fileUrl: await fileToDataUrl(uploadedFile),
              mimeType: uploadedFile.type || undefined
            };
          })
          .concat(
            additionalDocuments.map(async ({ documentId, file }) => {
                const original = existingDocuments.find((document) => document.id === documentId);
                if (!original) {
                  throw new Error("The selected document is no longer available.");
                }

                return {
                  type: original.type,
                  fileName: `Replacement for ${original.fileName} - ${file.name}`,
                  fileUrl: await fileToDataUrl(file),
                  mimeType: file.type || undefined
                };
              })
          )
      );

      const result = await driverApply({
        verificationToken: applicationUpdateToken ? undefined : form.verificationToken,
        applicationUpdateToken: applicationUpdateToken || undefined,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        email: form.email,
        address: `${form.address}, ${form.city}, ${form.postalCode}`,
        licenseNumber: form.licenseNumber,
        yearsOfExperience: experienceMap[form.experienceBand],
        emergencyContact: `${form.signatureName || "Applicant"} | ${form.phone}`,
        preferredServiceAreas: [form.serviceProvince],
        availabilitySchedule: notes,
        applicantResponse: applicationUpdateToken ? form.applicantResponse : undefined,
        replaceDocumentIds: applicationUpdateToken
          ? [
              ...Object.values(replaceDocumentIds).filter((documentId): documentId is string => Boolean(documentId)),
              ...additionalDocuments.map(({ documentId }) => documentId)
            ]
          : undefined,
        documents
      });

      const driverAbstractToken = result?.driverAbstractToken;
      router.push(
        applicationUpdateToken
          ? `/driver/status?email=${encodeURIComponent(form.email)}`
          : driverAbstractToken
            ? `/driver/background-check?token=${encodeURIComponent(driverAbstractToken)}`
            : `/driver/status?email=${encodeURIComponent(form.email)}`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicPageShell
      heroTitle="Driver application form"
    >
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Complete your driver application</h1>
              {!applicationUpdateToken && !form.verificationToken ? (
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Please verify your email from the link we sent before completing this application.
                </p>
              ) : null}
              {applicationUpdateToken ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Admin comment</div>
                  <p className="mt-1 whitespace-pre-wrap">{adminComment || "Please provide the requested update."}</p>
                </div>
              ) : null}
            </div>

            <form className="mt-8 space-y-8" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                  <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                  <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Phone number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: formatCanadianPhoneNumber(event.target.value) }))}
                    placeholder="+1 (204) 555-1234"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-slate-50"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    disabled={Boolean(applicationUpdateToken)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Date of birth</span>
                  <input type="date" className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Legally authorized to work in Canada</span>
                  <select className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.workAuthorized} onChange={(event) => setForm((current) => ({ ...current, workAuthorized: event.target.value }))}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Home address</span>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                      value={form.address}
                      onChange={(event) => {
                        setSelectedAddressId("");
                        setForm((current) => ({ ...current, address: event.target.value, city: "", postalCode: "" }));
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setAddressSuggestions([]), 150);
                      }}
                      placeholder="Start typing your home address"
                      autoComplete="street-address"
                      required
                    />
                    {mapboxToken && (addressSearching || addressSuggestions.length > 0) ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)]">
                        {addressSearching ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Searching addresses...</div>
                        ) : null}
                        {!addressSearching
                          ? addressSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                className="block w-full border-b border-[#EEF2FF] px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-[#F8FAFC]"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => applyAddressSuggestion(suggestion)}
                              >
                                {suggestion.label}
                              </button>
                            ))
                          : null}
                      </div>
                    ) : null}
                  </div>
                  {mapboxToken ? (
                    <span className="mt-2 block text-xs text-slate-500">
                      Select your address from the suggestions above. Auto fill your city and let the driver fill the postal code.
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">City</span>
                  <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Postal code</span>
                  <input
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 uppercase outline-none transition focus:border-[#2563EB]"
                    value={form.postalCode}
                    onChange={(event) => setForm((current) => ({ ...current, postalCode: formatCanadianPostalCode(event.target.value) }))}
                    placeholder="R3X 0R3"
                    autoComplete="postal-code"
                    maxLength={7}
                    pattern="[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]"
                    title="Enter a Canadian postal code, for example R3X 0R3."
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Driver&apos;s license number</span>
                  <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.licenseNumber} onChange={(event) => setForm((current) => ({ ...current, licenseNumber: event.target.value }))} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Province of issue</span>
                  <select
                    required
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]"
                    value={form.provinceOfIssue}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        provinceOfIssue: event.target.value,
                        licenseClass: ""
                      }))
                    }
                  >
                    <option value="">Select province or territory</option>
                    {provincesAndTerritories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">License class</span>
                  <select
                    required
                    disabled={!form.provinceOfIssue}
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-slate-100"
                    value={form.licenseClass}
                    onChange={(event) => setForm((current) => ({ ...current, licenseClass: event.target.value }))}
                  >
                    <option value="">{form.provinceOfIssue ? "Select licence class" : "Select province first"}</option>
                    {form.provinceOfIssue &&
                      licenceClassesByJurisdiction[form.provinceOfIssue as (typeof provincesAndTerritories)[number]].map((licenceClass) => (
                        <option key={licenceClass} value={licenceClass}>
                          {licenceClass}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">License expiry date</span>
                  <input type="date" className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.licenseExpiryDate} onChange={(event) => setForm((current) => ({ ...current, licenseExpiryDate: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Driving experience</span>
                  <select className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.experienceBand} onChange={(event) => setForm((current) => ({ ...current, experienceBand: event.target.value }))}>
                    <option value="2-3">2-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Preferred service province/territory</span>
                  <select required className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.serviceProvince} onChange={(event) => setForm((current) => ({ ...current, serviceProvince: event.target.value }))}>
                    <option value="">Select province or territory</option>
                    {provincesAndTerritories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Traffic violations", "trafficViolations", "trafficViolationsNotes"],
                  ["License suspensions", "licenseSuspensions", "licenseSuspensionsNotes"],
                  ["At-fault accidents", "atFaultAccidents", "atFaultAccidentsNotes"],
                  ["DUI / impaired driving", "duiHistory", "duiHistoryNotes"]
                ].map(([label, key, notesKey]) => {
                  const hasIssue = form[key as keyof typeof form] === "yes";

                  return (
                    <div key={key} className="rounded-2xl border border-[#E5E7EB] p-4">
                      <span className="mb-3 block text-sm font-medium text-slate-700">{label}</span>
                      <div className="flex gap-3">
                        {[
                          ["yes", "Yes"],
                          ["no", "No"]
                        ].map(([value, text]) => (
                          <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name={key}
                              value={value}
                              checked={form[key as keyof typeof form] === value}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                  [notesKey]: event.target.value === "yes" ? current[notesKey as keyof typeof current] : ""
                                }))
                              }
                            />
                            {text}
                          </label>
                        ))}
                      </div>
                      {hasIssue ? (
                        <textarea
                          className="mt-3 min-h-24 w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                          value={form[notesKey as keyof typeof form] as string}
                          onChange={(event) => setForm((current) => ({ ...current, [notesKey]: event.target.value }))}
                          placeholder="Please provide details"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Professional experience</span>
                  <div className="space-y-3 rounded-2xl border border-[#E5E7EB] p-4">
                    {professionalExperienceOptions.map((item) => (
                      <label key={item} className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.professionalExperience.includes(item)}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              professionalExperience: current.professionalExperience.includes(item)
                                ? current.professionalExperience.filter((value) => value !== item)
                                : item === "None"
                                  ? ["None"]
                                  : [...current.professionalExperience.filter((value) => value !== "None"), item]
                            }))
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#E5E7EB] p-4">
                    <span className="mb-3 block text-sm font-medium text-slate-700">Previous employer</span>
                    <div className="flex gap-3">
                      {[
                        ["yes", "Yes"],
                        ["no", "No"]
                      ].map(([value, text]) => (
                        <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name="previousEmployer"
                            value={value}
                            checked={form.previousEmployer === value}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                previousEmployer: event.target.value,
                                employerName: event.target.value === "yes" ? current.employerName : "",
                                employmentStartDate: event.target.value === "yes" ? current.employmentStartDate : "",
                                employmentEndDate: event.target.value === "yes" ? current.employmentEndDate : "",
                                currentlyWorkingThere: event.target.value === "yes" ? current.currentlyWorkingThere : false,
                                employerRole: event.target.value === "yes" ? current.employerRole : "",
                                employerProvince: event.target.value === "yes" ? current.employerProvince : "",
                                employerCountry: event.target.value === "yes" ? current.employerCountry : "Canada"
                              }))
                            }
                          />
                          {text}
                        </label>
                      ))}
                    </div>
                  </div>

                  {form.previousEmployer === "yes" ? (
                    <div className="grid gap-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">Employer name</span>
                        <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.employerName} onChange={(event) => setForm((current) => ({ ...current, employerName: event.target.value }))} />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Employment start date</span>
                          <input type="date" className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.employmentStartDate} onChange={(event) => setForm((current) => ({ ...current, employmentStartDate: event.target.value }))} />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Employment end date</span>
                          <input type="date" disabled={form.currentlyWorkingThere} className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB] disabled:bg-slate-100" value={form.employmentEndDate} onChange={(event) => setForm((current) => ({ ...current, employmentEndDate: event.target.value }))} />
                        </label>
                      </div>
                      <label className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.currentlyWorkingThere}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              currentlyWorkingThere: event.target.checked,
                              employmentEndDate: event.target.checked ? "" : current.employmentEndDate
                            }))
                          }
                        />
                        I still work there
                      </label>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block md:col-span-1">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
                          <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.employerRole} onChange={(event) => setForm((current) => ({ ...current, employerRole: event.target.value }))} />
                        </label>
                        <label className="block md:col-span-1">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Province</span>
                          <select
                            className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]"
                            value={form.employerProvince}
                            onChange={(event) => setForm((current) => ({ ...current, employerProvince: event.target.value }))}
                          >
                            <option value="">Select province/territory</option>
                            {provincesAndTerritories.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block md:col-span-1">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Country</span>
                          <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.employerCountry} onChange={(event) => setForm((current) => ({ ...current, employerCountry: event.target.value }))} />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Preferred working hours</span>
                  <div className="space-y-3 rounded-2xl border border-[#E5E7EB] p-4">
                    {workingHourOptions.map((item) => (
                      <label key={item} className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.preferredWorkingHours.includes(item)}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              preferredWorkingHours: current.preferredWorkingHours.includes(item)
                                ? current.preferredWorkingHours.filter((value) => value !== item)
                                : [...current.preferredWorkingHours, item]
                            }))
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Availability per week</span>
                    <select className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.weeklyAvailability} onChange={(event) => setForm((current) => ({ ...current, weeklyAvailability: event.target.value }))}>
                      <option value="Part-time">Part-time</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Do you own a vehicle?</span>
                    <select className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.ownVehicle} onChange={(event) => setForm((current) => ({ ...current, ownVehicle: event.target.value }))}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">Service capability- Are you comfortable with the following services?</span>
                <div className="grid gap-3 rounded-2xl border border-[#E5E7EB] p-4 md:grid-cols-2">
                  {serviceCapabilityOptions.map((item) => (
                    <label key={item} className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.serviceCapability.includes(item)}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            serviceCapability: current.serviceCapability.includes(item)
                              ? current.serviceCapability.filter((value) => value !== item)
                              : [...current.serviceCapability, item]
                          }))
                        }
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E5E7EB] p-4">
                  <span className="mb-3 block text-sm font-medium text-slate-700">
                    Are you certified in First Aid &amp; CPR, PSW, or any health/emergency related training?
                  </span>
                  <div className="flex gap-3">
                    {[
                      ["yes", "Yes"],
                      ["no", "No"]
                    ].map(([value, text]) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="healthEmergencyTraining"
                          value={value}
                          checked={form.healthEmergencyTraining === value}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              healthEmergencyTraining: event.target.value,
                              healthEmergencyTrainingDetails:
                                event.target.value === "yes" ? current.healthEmergencyTrainingDetails : ""
                            }))
                          }
                        />
                        {text}
                      </label>
                    ))}
                  </div>

                  {form.healthEmergencyTraining === "yes" ? (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Training details</span>
                      <input
                        className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                        value={form.healthEmergencyTrainingDetails}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, healthEmergencyTrainingDetails: event.target.value }))
                        }
                        placeholder="Example: First Aid & CPR, PSW, emergency response"
                      />
                    </label>
                  ) : null}
                </div>

                {form.healthEmergencyTraining === "yes" ? (
                  <label className="block rounded-2xl border border-[#E5E7EB] p-4">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Upload your certificate</span>
                    <input
                      type="file"
                      accept={uploadAccept}
                      className="block w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#EEF2FF] file:px-4 file:py-2 file:font-medium file:text-[#4338CA]"
                      onChange={(event) =>
                        selectDocument("healthTrainingCertificate", event.target.files?.[0] ?? null)
                      }
                    />
                    <span className="mt-2 block text-xs text-slate-500">
                      {uploadedFiles.healthTrainingCertificate
                        ? `Selected: ${uploadedFiles.healthTrainingCertificate.name}`
                        : "Required when you select Yes."}
                    </span>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#D8DEEA] bg-[#F8FAFC] p-4 text-sm text-slate-500">
                    If you hold First Aid, CPR, PSW, or related emergency-care training, select Yes and upload the certificate here.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] p-5">
                <div className="text-sm font-medium text-slate-700">Required documents</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {documentUploadFields.map(({ label, key, required }) => {
                    const file = uploadedFiles[key];

                    return (
                      <label key={key} className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
                        <input
                          type="file"
                          accept={uploadAccept}
                          required={!applicationUpdateToken && (required as boolean)}
                          className="block w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#EEF2FF] file:px-4 file:py-2 file:font-medium file:text-[#4338CA]"
                          onChange={(event) => selectDocument(key, event.target.files?.[0] ?? null)}
                        />
                        <span className="mt-2 block text-xs text-slate-500">
                          {file
                            ? `Selected: ${file.name}`
                            : applicationUpdateToken && existingDocumentFor(key)
                              ? `Current: ${existingDocumentFor(key)!.fileName}`
                            : key === "proofOfInsurance"
                              ? "Please attach the insurance page showing liability coverage and dates, not the pink slip."
                              : required
                                ? "Required upload"
                                : "Optional upload"}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {applicationUpdateToken && unmatchedExistingDocuments.length > 0 ? (
                  <div className="mt-5 space-y-3 border-t border-[#EEF2FF] pt-5">
                    <div className="text-sm font-medium text-slate-700">Other uploaded documents</div>
                    {unmatchedExistingDocuments.map((document) => (
                      <label key={document.id} className="block rounded-2xl border border-[#E5E7EB] p-4">
                        <span className="block text-sm font-medium text-slate-700">{document.fileName}</span>
                        <input
                          type="file"
                          accept={uploadAccept}
                          className="mt-3 block w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#EEF2FF] file:px-4 file:py-2 file:font-medium file:text-[#4338CA]"
                          onChange={(event) =>
                            setAdditionalReplacementFiles((current) => ({
                              ...current,
                              [document.id]: event.target.files?.[0] ?? null
                            }))
                          }
                        />
                        <span className="mt-2 block text-xs text-slate-500">
                          {additionalReplacementFiles[document.id]
                            ? `Selected: ${additionalReplacementFiles[document.id]!.name}`
                            : null}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="text-sm font-medium text-slate-700">Background & consent</div>
                  <p className="mt-4 text-sm text-slate-700">I confirm that I:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                    <li>Will treat customers respectfully</li>
                    <li>Will maintain professional appearance and conduct</li>
                    <li>Will follow all traffic laws and safety protocols</li>
                    <li>Will not operate under the influence of drugs or alcohol</li>
                    <li>Will respect customer privacy and property</li>
                  </ul>
                  <div className="mt-5 space-y-3">
                    {[
                      ["professionalStandards", "I confirm the statements above"],
                      ["criminalConsent", "I consent to a criminal background check"],
                      ["driverRecordConsent", "I consent to driver record verification"],
                      ["identityConsent", "I consent to identity verification"]
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form[key as keyof typeof form] as boolean}
                          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Signature</span>
                    <input
                      type="file"
                      accept={uploadAccept}
                      className="block w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#EEF2FF] file:px-4 file:py-2 file:font-medium file:text-[#4338CA]"
                      onChange={(event) => selectDocument("signature", event.target.files?.[0] ?? null)}
                    />
                    <span className="mt-2 block text-xs text-slate-500">
                      {uploadedFiles.signature
                        ? `Selected: ${uploadedFiles.signature.name}`
                        : applicationUpdateToken && existingDocumentFor("signature")
                          ? `Current: ${existingDocumentFor("signature")!.fileName}`
                          : "Upload your signature, or type your full name below."}
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Typed signature (optional)</span>
                    <input className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.signatureName} onChange={(event) => setForm((current) => ({ ...current, signatureName: event.target.value }))} placeholder="Type your full name if you are not uploading a signature" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Application date</span>
                    <input type="date" className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" value={form.applicationDate} onChange={(event) => setForm((current) => ({ ...current, applicationDate: event.target.value }))} />
                  </label>
                </div>
              </div>

              {applicationUpdateToken ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Your response to the admin comment</span>
                  <textarea
                    required
                    rows={5}
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                    value={form.applicantResponse ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, applicantResponse: event.target.value }))}
                  />
                </label>
              ) : null}

              {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

              <div className="flex justify-end border-t border-[#EEF0F4] pt-4">
                <button
                  type="submit"
                  disabled={loading || updateLoading || (applicationUpdateToken ? !applicationUpdateReady : !form.verificationToken)}
                  className="rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Submitting..." : applicationUpdateToken ? "Resubmit application" : "Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export default function DriverApplicationFormPage() {
  return (
    <Suspense
      fallback={
        <PublicPageShell
          heroTitle="Driver application form"
        >
          <section className="bg-white">
            <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
              <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              </div>
            </div>
          </section>
        </PublicPageShell>
      }
    >
      <DriverApplicationFormPageContent />
    </Suspense>
  );
}
