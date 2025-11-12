export type UserRole = 'professional' | 'company' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export interface Professional extends User {
  role: 'professional';
  skills: string[];
  experience: string;
  phone: string;
  location: string;
}

export interface Company extends User {
  role: 'company';
  companyName: string;
  phone: string;
  location: string;
}

export interface Admin extends User {
  role: 'admin';
  isMainAdmin: boolean;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  requirements: string[];
  salary?: string;
  status: 'pending' | 'approved' | 'rejected' | 'open' | 'closed';
  createdAt: string;
  applicationCount: number;
}

export interface Application {
  id: string;
  jobId: string;
  professionalId: string;
  professionalName: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}
