// Checks the keywords used by the current NEO-GAS record schema, not general JSON Schema.
import assert from 'node:assert/strict';
export function checkRecord(value, schema) {
 if(schema.type==='object') {assert.ok(value && typeof value==='object' && !Array.isArray(value));for(const key of schema.required??[])assert.ok(Object.hasOwn(value,key),`Missing ${key}`);for(const [key,sub] of Object.entries(schema.properties??{}))if(Object.hasOwn(value,key))checkRecord(value[key],sub);}
 else if(schema.type==='array'){assert.ok(Array.isArray(value));for(const item of value)checkRecord(item,schema.items);}
 else if(schema.type==='string'){assert.equal(typeof value,'string');if(schema.minLength)assert.ok([...value].length>=schema.minLength);if(schema.format==='date-time')assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value)));}
 if(schema.enum)assert.ok(schema.enum.includes(value));
}
