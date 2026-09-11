export function createNeoBankFirestoreStore({db}={}){
  if(!db?.collection) throw new Error('firestore_db_required');
  const accounts=db.collection('neoBankCesAccounts');
  return {
    async ping(){await db.collection('_neoBank').doc('health').get();return true},
    async account(accountNumber){
      const key=String(accountNumber||'').trim();
      if(!/^[A-Za-z0-9._-]{2,80}$/.test(key)) return null;
      const doc=await accounts.doc(key).get();
      return doc.exists?{accountNumber:key,...doc.data()}:null;
    }
  };
}
