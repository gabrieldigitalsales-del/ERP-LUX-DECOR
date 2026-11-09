/** Endereço estruturado com compatibilidade para cadastros antigos. */
export const formatCustomerAddress=(customer={})=>{
  const street=String(customer.street||'').trim();
  const number=String(customer.number||'').trim();
  const neighborhood=String(customer.neighborhood||'').trim();
  const complement=String(customer.complement||'').trim();
  const city=String(customer.city||'').trim();
  const state=String(customer.state||'').trim();
  const cep=String(customer.cep||'').trim();
  const structured=[street&&[street,number].filter(Boolean).join(', '),complement,neighborhood,[city,state].filter(Boolean).join(' - '),cep&&'CEP '+cep].filter(Boolean).join(' · ');
  return structured||String(customer.address||'').trim();
};
export const customerAddressFields=customer=>({
  street:String(customer?.street||''),
  number:String(customer?.number||''),
  neighborhood:String(customer?.neighborhood||''),
  cep:String(customer?.cep||''),
  complement:String(customer?.complement||''),
  city:String(customer?.city||''),
  state:String(customer?.state||'')
});
export const isValidCep=value=>!String(value||'').trim()||String(value).replace(/\D/g,'').length===8;
