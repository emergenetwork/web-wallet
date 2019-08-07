// Copyright 2017-2019 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { SubjectInfo } from '@polkadot/ui-keyring/observable/types';
import { ComponentProps } from './types';
import styled from 'styled-components';

import React from 'react';
import store from 'store'
import accountObservable from '@polkadot/ui-keyring/observable/accounts';
import { withMulti, withObservable, withCalls } from '@polkadot/ui-api';
import { Button, CardGrid, ColorButton} from '@polkadot/ui-app';
import BN from 'bn.js';
import translate from './translate';
import { formatBalance, formatKtonBalance, formatNumber } from '@polkadot/util';
import ringStakingBtn from './img/stakingBtn.svg';
import dayjs from 'dayjs'

type Props = ComponentProps & I18nProps & {
  accounts?: SubjectInfo[],
  balances_locks: Array<{ amount: BN }>,
  account: string,
  gringotts_depositLedger: { raw: { deposit_list: Array<any> } },
  onStakingNow: () => void
};

type State = {
  isCreateOpen: boolean,
  isRingStakingOpen: boolean,
  isImportOpen: boolean,
  isAccountsListOpen: boolean,
  AccountMain: string
};

class Overview extends React.PureComponent<Props, State> {
  state: State = {
    isRingStakingOpen: false,
    isCreateOpen: false,
    isImportOpen: false,
    isAccountsListOpen: false,
    AccountMain: '',

  };

  componentDidMount() {
  }

  formatDate(date) {
    if (date) {
      return dayjs(date).format("YYYY-MM-DD")
    }
  }

  process(start, month): number {
    const now = dayjs().unix();
    const end = dayjs(start).add(month * 30, 'day').unix();
    if (end <= now) {
      return 100
    } else {
      return 100 - (end - now) / (3600 * 24 * 30 * month) * 100
    }
  }
 

  render() {
    const { accounts, onStatusChange, t, balances_locks = [], account, gringotts_depositLedger = { raw: { deposit_list: [] } }, onStakingNow } = this.props;

    if (!gringotts_depositLedger || !gringotts_depositLedger.raw || !gringotts_depositLedger.raw.deposit_list || (gringotts_depositLedger && gringotts_depositLedger.raw.deposit_list && gringotts_depositLedger.raw.deposit_list.length === 0)) {
      return (
        <Wrapper>
          <table className={'stakingTable stakingTableEmpty'}>
            <tbody>
              <tr className='stakingTh'><td>Date</td><td>Deposit</td><td>Reward</td><td>Setting</td></tr>
              <tr>
                <td colSpan={4} className="emptyTd">
                  <p className="no-items">No items</p>
                  <ColorButton onClick={onStakingNow}>{t('Deposit Now')}</ColorButton>
                </td>
              </tr>
            </tbody>
          </table>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <table className={'stakingTable'}>
          <tbody>
            <tr className='stakingTh'><td>Date</td><td>Deposit</td><td>Reward</td><td>Setting</td></tr>
            {gringotts_depositLedger && gringotts_depositLedger.raw.deposit_list && gringotts_depositLedger.raw.deposit_list.map((item, index) => {

              return <tr key={index}>
                <td>
                  <p className="stakingRange">{`${this.formatDate(new BN(item.start_at).toNumber() * 1000)} - ${this.formatDate(dayjs(new BN(item.start_at).toNumber() * 1000).add(new BN(item.month).toNumber() * 30, 'day').valueOf())}`}</p>
                  <div className="stakingProcess">
                    <div className="stakingProcessPassed" style={{ width: `${this.process(new BN(item.start_at).toNumber() * 1000, new BN(item.month).toNumber())}%` }}></div>
                  </div>
                </td>
                <td>{formatBalance(item.value)}</td>
                <td className="textGradient">{formatKtonBalance(item.balance)}</td>
                <td>----</td>
              </tr>
            })}
          </tbody>
        </table>
      </Wrapper>
    );
  }
}

const Wrapper = styled.div`
    padding-bottom: 30px;
    .stakingTable{
      border-collapse: collapse;
      background: #fff;
      width: 100%;
      border-radius:2px;
      border:1px solid rgba(237,237,237,1);
      td{
        width: 25%;
        font-weight: bold;
      }
      .stakingProcess{
        height:3px;
        background:rgba(216,216,216,1);
        border-radius:4px;
        margin: 0 12%;
      }
      .stakingRange{
        margin-bottom: 6px;
      }
      .stakingProcessPassed{
        height:3px;
        background:linear-gradient(315deg,rgba(254,56,118,1) 0%,rgba(124,48,221,1) 71%,rgba(58,48,221,1) 100%);
        border-radius:4px;
      }
      .stakingTh{
        td{
          font-size: 16px;
        }
      }
      tr{
        td{
          text-align: center;
          padding: 24px 10px;
        }
      }
      tr:nth-child(even) {
        td{
          background: #FBFBFB;
        }
      }
      
    }

    .stakingTableEmpty{
      .no-items{
        padding: 15px;
        text-align: center;
        color: #B4B6BC;
        margin-bottom: 0;
      }
      .emptyTd{
        padding: 100px 0!important;
        background: #fff!important;
      }
    }

    /* .textGradient{
      background: linear-gradient(to right, red, blue);
        -webkit-background-clip: text;
        color: transparent;
    } */
`

export default withMulti(
  Overview,
  translate,
  withCalls<Props>(
    ['query.balances.locks', { paramName: 'account' }],
    ['query.gringotts.depositLedger', { paramName: 'account' }],
  ),
  // withObservable(accountObservable.subject, { propName: 'accounts' })
);
