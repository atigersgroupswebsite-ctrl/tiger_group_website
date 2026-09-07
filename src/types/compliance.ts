export interface RegistrationItem {
  id: string;
  cardNumber: number;
  title: string;
  authority: string;
  entityLabel: string;
  entityName: string;
  referenceLabel: string;
  registrationReference: string;
  businessActivity?: string;
  description: string;
  documentType: string;
  jurisdiction: string;
  legalScope: string;
  issueDate?: string;
  validityStatus?: string;
}
