export type PartnerShare = {
  id: number;
  ad: string;
  rol: string;
  hisseOran: number;
  sermaye: number;
};

export type PartnerCompare = PartnerShare & {
  giderPayi: number;
  fark: number;
  brutKar: number;
  stopaj: number;
  netOdeme: number;
};

import { Decimal } from "../../lib/financialMath";
import { money, moneyNumber } from "../money";

export function comparePartners(partners: PartnerShare[], expenseTotal: number, netProfit: number): PartnerCompare[] {
  return partners.map((partner) => {
    const ratio = new Decimal(partner.hisseOran).div(100);
    const giderPayi = moneyNumber(new Decimal(expenseTotal).times(ratio));
    const brutKar = moneyNumber(new Decimal(netProfit).times(ratio));
    const stopaj = moneyNumber(money(brutKar).times("0.1"));
    return {
      ...partner,
      giderPayi,
      fark: moneyNumber(money(partner.sermaye).minus(giderPayi)),
      brutKar,
      stopaj,
      netOdeme: moneyNumber(money(brutKar).minus(stopaj)),
    };
  });
}
