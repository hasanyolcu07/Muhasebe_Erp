import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comparePartners } from "../server/services/kobi.logic";

describe("ortaklık gider farkı", () => {
  it("gideri hisseye böler ve sermaye farkını yazar", () => {
    const rows = comparePartners(
      [
        { id: 1, ad: "A", rol: "Ortak", hisseOran: 60, sermaye: 600 },
        { id: 2, ad: "B", rol: "Ortak", hisseOran: 40, sermaye: 400 },
      ],
      250,
      1000,
    );
    assert.equal(rows[0].giderPayi, 150);
    assert.equal(rows[0].fark, 450);
    assert.equal(rows[0].brutKar, 600);
    assert.equal(rows[0].stopaj, 60);
    assert.equal(rows[0].netOdeme, 540);
    assert.equal(rows[1].giderPayi, 100);
    assert.equal(rows[1].fark, 300);
  });
});
