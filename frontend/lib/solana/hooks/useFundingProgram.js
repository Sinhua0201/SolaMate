import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram } from '@/lib/solana/anchorSetup';
import { SEEDS } from '@/lib/solana/programIds';

/**
 * 创建福利活动
 */
export function useCreateFundingEvent() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const createEvent = async (title, amount, deadline, ipfsHash) => {
        if (!publicKey) {
            throw new Error('Wallet not connected');
        }

        setIsLoading(true);
        setError(null);

        try {
            const program = getProgram(wallet);

            // 生成时间戳作为种子
            const timestamp = Math.floor(Date.now() / 1000);

            // 将 timestamp 转换为 i64 的 little-endian 字节
            const timestampBuffer = new ArrayBuffer(8);
            const view = new DataView(timestampBuffer);
            view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian
            const timestampBytes = Buffer.from(timestampBuffer);

            // 计算 PDA
            const [fundingEventPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(SEEDS.FUNDING_EVENT),
                    publicKey.toBuffer(),
                    timestampBytes
                ],
                program.programId
            );

            // 转换参数为正确的类型
            const amountBN = new BN(amount);
            const deadlineBN = new BN(deadline);
            const timestampBN = new BN(timestamp);

            const tx = await program.methods
                .createFundingEvent(title, amountBN, deadlineBN, ipfsHash, timestampBN)
                .accounts({
                    fundingEvent: fundingEventPDA,
                    creator: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Funding event created:', tx);
            return { success: true, signature: tx, eventPDA: fundingEventPDA };
        } catch (err) {
            console.error('Error creating funding event:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { createEvent, isLoading, error };
}

/**
 * 申请资助
 */
export function useApplyForFunding() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const applyForFunding = async (eventPDA, requestedAmount, ipfsHash) => {
        if (!publicKey) {
            throw new Error('Wallet not connected');
        }

        setIsLoading(true);
        setError(null);

        try {
            const program = getProgram(wallet);

            // 获取活动数据
            const eventData = await program.account.fundingEvent.fetch(eventPDA);

            // 计算 Application PDA
            const [applicationPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(SEEDS.APPLICATION),
                    eventPDA.toBuffer(),
                    publicKey.toBuffer()
                ],
                program.programId
            );

            // 转换金额为 BN
            const amountBN = new BN(requestedAmount);

            const tx = await program.methods
                .applyForFunding(amountBN, ipfsHash)
                .accounts({
                    fundingEvent: eventPDA,
                    application: applicationPDA,
                    applicant: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Application submitted:', tx);
            return { success: true, signature: tx, applicationPDA };
        } catch (err) {
            console.error('Error applying for funding:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { applyForFunding, isLoading, error };
}

/**
 * 批准申请
 */
export function useApproveApplication() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [isLoading, setIsLoading] = useState(false);

    const approveApplication = async (eventPDA, applicationPDA, approvedAmount) => {
        if (!publicKey) throw new Error('Wallet not connected');

        setIsLoading(true);
        try {
            const program = getProgram(wallet);

            // 转换金额为 BN
            const amountBN = new BN(approvedAmount);

            const tx = await program.methods
                .approveApplication(amountBN)
                .accounts({
                    fundingEvent: eventPDA,
                    application: applicationPDA,
                    creator: publicKey,
                })
                .rpc();

            return { success: true, signature: tx };
        } catch (err) {
            console.error('Error approving application:', err);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { approveApplication, isLoading };
}

/**
 * 发放资金
 */
export function useDisburseFunds() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [isLoading, setIsLoading] = useState(false);

    const disburseFunds = async (eventPDA, applicationPDA, applicantAddress) => {
        if (!publicKey) throw new Error('Wallet not connected');

        setIsLoading(true);
        try {
            const program = getProgram(wallet);

            const tx = await program.methods
                .disburseFunds()
                .accounts({
                    fundingEvent: eventPDA,
                    application: applicationPDA,
                    applicant: new PublicKey(applicantAddress),
                    creator: publicKey,
                })
                .rpc();

            return { success: true, signature: tx };
        } catch (err) {
            console.error('Error disbursing funds:', err);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { disburseFunds, isLoading };
}
