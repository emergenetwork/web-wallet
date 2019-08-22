// Copyright 2017-2019 @polkadot/api-contract authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { ContractABI, ContractABIFn, IAbi, IAbi$Messages } from './types';

import { stringCamelCase } from '@polkadot/util';

import { createMethod } from './method';
import { validateAbi } from './validation';

export default class ContractAbi implements IAbi {
  readonly abi: ContractABI;
  readonly deploy: ContractABIFn;
  readonly messages: IAbi$Messages = {};

  constructor (abi: ContractABI) {
    validateAbi(abi);

    this.abi = abi;
    this.deploy = createMethod('deploy', abi.deploy);

    abi.messages.forEach((method) => {
      const name = stringCamelCase(method.name);

      this.messages[name] = createMethod(`messages.${name}`, method);
    });
  }
}
