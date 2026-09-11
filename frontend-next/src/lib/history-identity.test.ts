import { expect, it } from "vitest";
import { historyIdentity } from "./history-identity";
it("distinguishes scheduled and manual runs with the same database id",()=>{
 expect(historyIdentity({id:1})).not.toBe(historyIdentity({id:1,_type:"schedule"}));
 expect(historyIdentity({id:1})).toBe(historyIdentity({id:"1"}));
});
