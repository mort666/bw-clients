import {
  AsymmetricEncryptionTypes,
  EncryptionType,
  SymmetricEncryptionTypes,
} from "./encryption-type.enum";

describe("EncryptionType", () => {
  it("classifies all types as symmetric or asymmetric", () => {
    const nSymmetric = SymmetricEncryptionTypes.length;
    const nAsymmetric = AsymmetricEncryptionTypes.length;
    const nTotal = nSymmetric + nAsymmetric;
    // enums are indexable by string and number
    expect(Object.keys(EncryptionType).length).toEqual(nTotal * 2);
  });
});
