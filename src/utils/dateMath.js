/** Datas comerciais em YYYY-MM-DD, sem depender de fuso/horário de verão.
 * Parcelas lançadas no dia 29/30/31 vencem no último dia dos meses mais curtos.
 */
function parse(date){
 const value=String(date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Data comercial inválida.');
 const [year,month,day]=value.split('-').map(Number);
 const max=new Date(Date.UTC(year,month,0)).getUTCDate();
 if(month<1||month>12||day<1||day>max)throw Error('Data comercial inválida.');
 return {year,month,day};
}
const format=date=>[String(date.getUTCFullYear()).padStart(4,'0'),String(date.getUTCMonth()+1).padStart(2,'0'),String(date.getUTCDate()).padStart(2,'0')].join('-');
export function addMonthsClamped(date,months){
 const {year,month,day}=parse(date);
 const target=new Date(Date.UTC(year,month-1+Math.trunc(Number(months)||0),1));
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(day,last));
 return format(target);
}
export function addDaysIso(date,days){
 const {year,month,day}=parse(date);
 return format(new Date(Date.UTC(year,month-1,day+Math.trunc(Number(days)||0))));
}
