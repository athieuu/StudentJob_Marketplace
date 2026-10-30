export type Role = 'STUDENT' | 'EMPLOYER' | 'ADMIN';
export type JobType = 'PART_TIME' | 'FULL_TIME' | 'FREELANCE';
export type JobStatus = 'OPEN' | 'CLOSED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface User { id:string; name:string; email:string; role:Role; status:'ACTIVE'|'INACTIVE'; company?:string; phone?:string; university?:string; major?:string; skills?:string[]; bio?:string; cvUrl?:string; joinedAt:string }
export interface Job { id:string; title:string; company:string; employerId:string; category:string; type:JobType; salaryMin:number; salaryMax:number; location:string; arrangement:'On-site'|'Hybrid'|'Remote'; description:string; responsibilities:string[]; requirements:string[]; skills:string[]; deadline:string; postedAt:string; status:JobStatus; moderation:ModerationStatus; applicants:number }
export interface Application { id:string; jobId:string; studentId:string; appliedAt:string; status:ApplicationStatus; message:string; cvUrl:string }
export interface Review { id:string; jobId:string; studentId:string; rating:number; comment:string; createdAt:string }
