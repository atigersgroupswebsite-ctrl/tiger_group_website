export interface PartnerRelationship {
  id: string;
  name: string;
  unitOrTagline: string;
  logo: string;
  category: string;
}

export const PARTNER_ORGANIZATIONS: PartnerRelationship[] = [
  {
    id: 'haldirams',
    name: "Haldiram's",
    unitOrTagline: 'Haldirams Snacks Food Pvt. Ltd. (Unit - "HARIOMKAR")',
    logo: '/assets/partners/haldirams.webp',
    category: 'Food Processing & Confectionery'
  },
  {
    id: 'signet-group',
    name: 'Signet Group',
    unitOrTagline: 'Signet Group — An ISO 9001:2008 Company',
    logo: '/assets/partners/signet.jpeg',
    category: 'Industrial Manufacturing & Engineering'
  },
  {
    id: 'geeta-glass',
    name: 'Geeta Glass',
    unitOrTagline: 'Geeta Glass India Private Limited',
    logo: '/assets/partners/geeta-glass.jpeg',
    category: 'Architectural & Safety Glass Manufacturing'
  }
];
