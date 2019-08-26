// Copyright 2017-2019 @polkadot/ui-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { ApiProps } from '@polkadot/ui-api/types';
import { CalculateBalanceProps } from '../types';

import BN from 'bn.js';
import React from 'react';
import { Button, InputAddress, InputBalance, InputNumber, Modal, TxButton, TxComponent, Dropdown } from '@polkadot/ui-app';
import { Option, StakingLedger } from '@polkadot/types';
import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { withCalls, withApi, withMulti } from '@polkadot/ui-api';
import { calcSignatureLength } from '@polkadot/ui-signer/Checks';
import { ZERO_BALANCE, ZERO_FEES } from '@polkadot/ui-signer/Checks/constants';
import { SubmittableResult } from '@polkadot/api/SubmittableExtrinsic';
import styled from 'styled-components'
import { Checkbox } from 'semantic-ui-react'
import { formatBalance, formatNumber, formatKtonBalance } from '@polkadot/util';
import { ringToKton, assetToPower } from '@polkadot/util'
import translate from '../translate';

type Props = I18nProps & ApiProps & CalculateBalanceProps & {
  accountId: string,
  controllerId: string,
  isOpen: boolean,
  onClose: () => void,
  onSuccess?: (status: SubmittableResult) => void,
  staking_ledger?: Option<StakingLedger>,
  kton_freeBalance: BN,
  kton_locks: Array<any>,
  stashId?: string,
  balances_locks: Array<any>,
  balances_freeBalance?: BN,
};

type State = {
  maxAdditional?: BN,
  extrinsic: SubmittableExtrinsic | null,
  maxBalance?: BN,
  type: string,
  lockLimit: number,
  accept: boolean
};

const ZERO = new BN(0);

const ockLimitOptionsMaker = (): Array<object> => {
  const month = [0, 3, 6, 12, 18, 24, 30, 36]
  let options = []
  month.map((i) => {
    options.push({
      text: i === 0 ? 'Not fixed term' : `${i} Month`,
      value: i
    })
  })

  return options
}

const lockLimitOptions = ockLimitOptionsMaker()



const StyledWrapper = styled.div`
    display: flex;
    margin-top: -4px;
    label{
      flex: 0 0 15rem;
    }
    &>div{
      border: 1px solid #DEDEDF;
      p{
        color: #98959F;
        font-size: 12px;
      }
      
      padding: 10px 20px;
      background: #FBFBFB;
    }
`

const GetPowerStyledWrapper = styled.div`
  font-size: 0;
  margin-top: 20px;
  p{
    text-align: right;
    font-size: 16px;
    color: #302B3C;
    margin-bottom: 10px;
  }
  p:last-child{
    margin-top: 0;
    margin-bottom: 0;
  }
  span{
    color: #5930DD;
    font-weight: bold;
  }
`

class BondExtra extends TxComponent<Props, State> {
  state: State = {
    extrinsic: null,
    lockLimit: 0,
    type: 'ring',
    accept: false
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { balances_fees } = this.props;
    const { extrinsic } = this.state;

    const hasLengthChanged = ((extrinsic && extrinsic.encodedLength) || 0) !== ((prevState.extrinsic && prevState.extrinsic.encodedLength) || 0);

    if ((balances_fees !== prevProps.balances_fees) ||
      hasLengthChanged
    ) {
      this.setMaxBalance();
    }
  }


  getKtonAmount = () => {
    const { type, maxAdditional = ZERO, lockLimit } = this.state
    let kton = null;
    let parsedBondValue = maxAdditional
    if (type === 'ring' && lockLimit != 0) {
      return formatBalance(new BN(ringToKton(parsedBondValue.toString(), lockLimit)), false)
    }
    return '0'
  }

  getPowerAmount = () => {
    const { type, maxAdditional = ZERO } = this.state
    let power = ZERO;
    power = assetToPower(maxAdditional, type)
    return formatBalance(power, false)
  }


  render() {
    const { accountId, balances_all = ZERO_BALANCE, isOpen, onClose, onSuccess, t } = this.props;
    const { extrinsic, maxAdditional, maxBalance = balances_all.availableBalance, lockLimit, accept, type } = this.state;
    // const canSubmit = !!maxAdditional && maxAdditional.gtn(0) && maxAdditional.lte(maxBalance)
    const canSubmit = !!maxAdditional && maxAdditional.gtn(0) && (lockLimit && type === 'ring' ? accept : true);

    if (!isOpen) {
      return null;
    }

    return (
      <Modal
        className='staking--BondExtra'
        dimmer='inverted'
        open
        size='small'
        onClose={onClose}
      >
        {this.renderContent()}
        <Modal.Actions>
          <Button.Group>
            <TxButton
              accountId={accountId}
              isDisabled={!canSubmit}
              isPrimary
              label={t('Bond')}
              onClick={onClose}
              extrinsic={extrinsic}
              ref={this.button}
              withSpinner={true}
              onSuccess={onSuccess}
            />
            <Button
              isBasic={true}
              isSecondary={true}
              onClick={onClose}
              label={t('Cancel')}
            />
          </Button.Group>
        </Modal.Actions>
      </Modal>
    );
  }


  private toggleAccept = () => {
    const { accept } = this.state;
    this.nextState({ accept: !accept });
  }

  private onChangeLockLimit = (lockLimit: number) => {
    this.nextState({ lockLimit });
  }

  private onChangeType = (type?: string) => {
    this.nextState({ type, lockLimit: 0 });
  }

  private renderContent() {
    const { accountId, balances_locks, kton_locks, balances_freeBalance,kton_freeBalance, t } = this.props;
    const { maxBalance, lockLimit, accept, type } = this.state;

    let _balances_locks = new BN(0)
    let _ktonBalances_locks = new BN(0)

    if (balances_locks) {
      balances_locks.forEach((item) => {
        _balances_locks = _balances_locks.add(item.amount)
      })
    }
    if (kton_locks) {
      kton_locks.forEach((item) => {
        _ktonBalances_locks = _ktonBalances_locks.add(item.amount)
      })
    }

    const ringAvailableBalance = formatBalance((balances_freeBalance && balances_locks) ? balances_freeBalance.sub(_balances_locks).toString() : '0')
    const ktonAvailableBalance = formatKtonBalance((kton_freeBalance && kton_locks) ? kton_freeBalance.sub(_ktonBalances_locks).toString() : '0')

    return (
      <>
        <Modal.Header>
          {t('Bond additional funds')}
        </Modal.Header>
        <Modal.Content className='ui--signer-Signer-Content'>
          <InputAddress
            className='medium'
            defaultValue={accountId}
            isDisabled
            label={t('stash account')}
          />
          <InputNumber
            autoFocus
            className='medium'
            help={t('The maximum amount to increase the bonded value, this is adjusted using the available free funds on the account.')}
            label={t('max additional value')}
            siValue={'kton'}
            placeholder={type ==='ring' ? ringAvailableBalance : ktonAvailableBalance}
            // maxValue={maxBalance}
            onChange={this.onChangeValue}
            onEnter={this.sendTx}
            // withMax
            onChangeType={this.onChangeType}
            isType
          />

          {type === 'ring' ? <Dropdown
            className='medium'
            defaultValue={lockLimit}
            help={t('lock limit')}
            label={t('lock limit')}
            onChange={this.onChangeLockLimit}
            options={lockLimitOptions}
          // value={lockLimit}
          /> : null}

          {(lockLimit && type === 'ring') ? <StyledWrapper>
            <label></label>
            <div>
              <p>After setting a lock limit, you will receive an additional KTON bonus; if you unlock it in advance within the lock limit, you will be charged a penalty of 3 times the KTON reward.</p>
              <Checkbox checked={accept} onChange={this.toggleAccept} label='I Accept' />
            </div>
          </StyledWrapper> : null}

          <GetPowerStyledWrapper>
            <p>You will get: <span>{this.getPowerAmount()} POWER</span></p>
            {(lockLimit && type === 'ring') ? <p><span>{this.getKtonAmount()} KTON</span></p> : null}
          </GetPowerStyledWrapper>
        </Modal.Content>
      </>
    );
  }

  private nextState(newState: Partial<State>): void {
    this.setState((prevState: State): State => {
      const { api } = this.props;
      const { maxAdditional = prevState.maxAdditional, maxBalance = prevState.maxBalance, type = prevState.type, lockLimit = prevState.lockLimit, accept = prevState.accept } = newState;
      // const extrinsic = (maxAdditional && maxAdditional.gte(ZERO))
      //   ? api.tx.staking.bondExtra(maxAdditional,1)
      //   : null;
      const typeKey = type.charAt(0).toUpperCase() + type.slice(1)

      const extrinsic = (maxAdditional && maxAdditional.gte(ZERO))
        ? api.tx.staking.bondExtra({ [typeKey]: maxAdditional }, lockLimit)
        : null;

      return {
        maxAdditional,
        extrinsic,
        maxBalance,
        lockLimit,
        type,
        accept
      };
    });
  }

  private setMaxBalance = () => {
    const { api, system_accountNonce = ZERO, balances_fees = ZERO_FEES, balances_all = ZERO_BALANCE, staking_ledger, kton_freeBalance = ZERO, kton_locks } = this.props;
    const { maxAdditional, lockLimit, type } = this.state;

    const { transactionBaseFee, transactionByteFee } = balances_fees;
    const { freeBalance } = balances_all;

    let prevMax = new BN(0);
    let maxBalance = new BN(1);
    let extrinsic;

    let bonded = new BN(0);
    if (staking_ledger && !staking_ledger.isNone) {
      bonded = staking_ledger.unwrap().active;
    }

    while (!prevMax.eq(maxBalance)) {
      prevMax = maxBalance;

      // extrinsic = (maxAdditional && maxAdditional.gte(ZERO))
      //   ? api.tx.staking.bondExtra(maxAdditional.sub(bonded), 1)
      //   : null;
      const typeKey = type.charAt(0).toUpperCase() + type.slice(1)

      extrinsic = (maxAdditional && maxAdditional.gte(ZERO))
        ? api.tx.staking.bondExtra({ [typeKey]: maxAdditional }, lockLimit)
        : null;

      const txLength = calcSignatureLength(extrinsic, system_accountNonce);

      const fees = transactionBaseFee
        .add(transactionByteFee.muln(txLength));

      let _ktonBalances_locks = ZERO
      if (kton_locks) {
        kton_locks.forEach((item, index) => {
          _ktonBalances_locks = _ktonBalances_locks.add(new BN(item.amount))
        })
      }
      console.log(3, _ktonBalances_locks, kton_freeBalance)
      maxBalance = kton_freeBalance.sub(_ktonBalances_locks);
    }

    this.nextState({
      extrinsic,
      maxBalance
    });
  }

  private onChangeValue = (maxAdditional?: BN) => {
    this.nextState({ maxAdditional });
  }
}

export default withMulti(
  BondExtra,
  translate,
  withApi,
  withCalls<Props>(
    'derive.balances.fees',
    ['derive.balances.all', { paramName: 'accountId' }],
    ['query.balances.locks', { paramName: 'accountId' }],
    ['query.balances.freeBalance', { paramName: 'accountId' }],
    ['query.system.accountNonce', { paramName: 'accountId' }],
    ['query.staking.ledger', { paramName: 'controllerId' }],
    ['query.kton.locks', { paramName: 'accountId' }],
    ['query.kton.freeBalance', { paramName: 'accountId' }]
  )
);
