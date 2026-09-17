import { z } from "zod";
import { ConfirmCoursesSchema, ProductionCourseInputSchema } from "@/lib/production-types";
import { ApiError, apiFailure } from "@/lib/server/api-errors";
import { parseJson } from "@/lib/server/api-request";
import { requireAuthenticatedUserId } from "@/lib/server/auth";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

const CourseWriteSchema = z.union([ConfirmCoursesSchema, ProductionCourseInputSchema]);

export async function GET() {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    return Response.json({ courses: (await studentRepository.load(clerkUserId)).courses }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    const input = await parseJson(request, CourseWriteSchema);
    if ("courses" in input) {
      const courses = await studentRepository.confirmCourses(clerkUserId, input.courses);
      return Response.json({ courses }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ course: await studentRepository.saveCourse(clerkUserId, input) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("course_id_required", "Choose a course to remove.", 400);
    await studentRepository.deleteCourse(clerkUserId, id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
