export type StaffRole='owner'|'manager'|'cashier'|'viewer';
export type StaffPermission='register'|'refunds'|'catalog'|'devices'|'reports'|'settings';

export type MerchantProfile={id:string;name:string;legalName?:string;supportEmail?:string;phone?:string;currency:string;timezone:string};
export type Location={id:string;name:string;address?:string;taxRuleId:string;terminalIds:string[]};
export type TaxRule={id:string;name:string;rate:number;inclusive:boolean;enabled:boolean};
export type CatalogItem={id:string;name:string;price:number;category:string;sku:string;barcode?:string;inventoryTracked:boolean;quantity:number;active:boolean};
export type ReceiptTemplate={id:string;name:string;header:string;footer:string;showLocation:boolean;showTaxBreakdown:boolean};
export type TerminalAssignment={terminalId:string;locationId:string;label:string;enabled:boolean};
export type StaffMember={id:string;name:string;role:StaffRole;permissions:StaffPermission[];active:boolean};

export type MerchantOpsState={
  merchant:MerchantProfile;
  locations:Location[];
  taxRules:TaxRule[];
  catalog:CatalogItem[];
  receiptTemplates:ReceiptTemplate[];
  terminalAssignments:TerminalAssignment[];
  staff:StaffMember[];
  activeLocationId:string;
  activeReceiptTemplateId:string;
};
