export type CounselorEmailCourse = {
  code: string;
  title: string;
  units: number;
};

export type CounselorEmailPayload = {
  studentName: string;
  primaryLabel: string;
  secondaryLabels: string[];
  nextTermLabel: string;
  courses: CounselorEmailCourse[];
  totalUnits: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCounselorEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function buildCounselorMailto(payload: CounselorEmailPayload) {
  const name = payload.studentName.trim() || "a College of the Canyons student";
  const also = payload.secondaryLabels.length ? ` Also planning: ${payload.secondaryLabels.join(", ")}.` : "";
  const classes = payload.courses.length
    ? payload.courses.map((course) => `- ${course.code} ${course.title} (${course.units} units)`).join("\n")
    : "- No classes scheduled";
  const subject = `COC transfer plan — ${payload.primaryLabel} — ${payload.nextTermLabel}`;
  const body = `Hi,

I'm ${name}. I'm using this list as a starting point for counseling.

First choice: ${payload.primaryLabel}.${also}

Next semester (${payload.nextTermLabel}):
${classes}
${payload.totalUnits} COC units.

This is a planning list from Waylo, based on official ASSIST agreements. It is not an official degree audit or admission decision. I'd like to confirm it before I enroll.

Thank you
${payload.studentName.trim() || "Student"}`;
  return { subject, body };
}

export function counselorMailtoHref(address: string, payload: CounselorEmailPayload) {
  const { subject, body } = buildCounselorMailto(payload);
  return `mailto:${encodeURIComponent(address.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
