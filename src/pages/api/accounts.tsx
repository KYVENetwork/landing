import { connectToDatabase } from "../../utils/mongodb";

const GOVERNANCE = "C_1uo08qRuQAeDi9Y1I8fkaWYUC9IWkOrKDNe9EphJo";
const TREASURY = "RCH2pVk8m-IAuwg36mwxUt8Em_CnpWjSLpiAcCvZJMA";

const format = (input: number) => {
  return parseFloat(input.toFixed(2));
};

export default async (req, res) => {
  const { db } = await connectToDatabase();

  const contracts = await db.collection("contracts").find().toArray();
  const governance = contracts.find((contract) => contract._id === GOVERNANCE)
    .state;

  const accounts: {
    address: string;
    type?: "pool" | "treasury";
    balance: number;
    credit: number;
    stake: number;
    total: number;
  }[] = [];

  for (const address of Object.keys(governance.balances)) {
    const balance = governance.balances[address];
    let stake = 0;
    if (address in governance.vault) {
      stake = governance.vault[address]
        .map((entry) => entry.balance)
        .reduce((a, b) => a + b, 0);
    }

    let type = address === TREASURY ? "treasury" : undefined;
    const index = contracts.findIndex((contract) => contract._id === address);
    if (index > -1) type = "pool";

    let credit = 0;
    for (const contract of contracts) {
      if (contract._id === GOVERNANCE) continue;

      const state = contract.state;
      if (address in state.credit) {
        credit += state.credit[address].amount;
        stake += state.credit[address].stake;
      }
    }

    const total = format(balance) + format(credit) + format(stake);
    accounts.push({
      address,
      // @ts-ignore
      type,
      balance: format(balance),
      credit: format(credit),
      stake: format(stake),
      total: format(total),
    });
  }

  res.json(accounts.sort((a, b) => b.total - a.total));
};
