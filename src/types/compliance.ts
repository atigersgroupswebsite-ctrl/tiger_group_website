export interface RegistrationItem {
  id: string;
  cardNumber: number;
  title: string;
  authority: string;
  description: string;
  documentType: string;
  registrationReference: string;
  jurisdiction: string;
  legalScope: string;
  issueDate?: string;
  validityStatus?: string;
  documentAsset?: string;
}
