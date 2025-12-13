import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram } from '@/lib/solana/anchorSetup';
import { SolanaConnectButton } from '../components/solana-connect-button';

const PROGRAM_ID = new PublicKey('ETsJTuFTVWRPW9xoMozFQxwuEpJXN3Z9xnWxdV7rcLcz');

export default function TestGroupSplit() {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const [title, setTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [memberAddresses, setMemberAddresses] = useState('');
    const [ipfsHash, setIpfsHash] = useState('QmTest123');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const createGroupSplit = async () => {
        if (!publicKey || !wallet) {
            setError('Please connect wallet first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const program = getProgram(wallet);
            const timestamp = Math.floor(Date.now() / 1000);

            const members = memberAddresses
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);

            if (members.length === 0) {
                throw new Error('Please add at least one member');
            }

            if (members.length > 20) {
                throw new Error('Maximum 20 members allowed');
            }

            const [groupSplitPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('group_split'),
                    publicKey.toBuffer(),
                    new BN(timestamp).toArrayLike(Buffer, 'le', 8),
                ],
                PROGRAM_ID
            );

            console.log('Creating group split...');
            console.log('Title:', title);
            console.log('Total Amount:', totalAmount);
            console.log('Member Count:', members.length);
            console.log('Group Split PDA:', groupSplitPDA.toString());

            const amountLamports = new BN(parseFloat(totalAmount) * LAMPORTS_PER_SOL);

            const tx = await program.methods
                .createGroupSplit(
                    title,
                    amountLamports,
                    members.length,
                    ipfsHash,
                    new BN(timestamp)
                )
                .accounts({
                    groupSplit: groupSplitPDA,
                    creator: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Group split created:', tx);

            for (const memberAddr of members) {
                try {
                    const memberPubkey = new PublicKey(memberAddr);

                    const [splitMemberPDA] = await PublicKey.findProgramAddress(
                        [
                            Buffer.from('split_member'),
                            groupSplitPDA.toBuffer(),
                            memberPubkey.toBuffer(),
                        ],
                        PROGRAM_ID
                    );

                    const memberTx = await program.methods
                        .addSplitMember(memberPubkey)
                        .accounts({
                            groupSplit: groupSplitPDA,
                            splitMember: splitMemberPDA,
                            creator: publicKey,
                            systemProgram: SystemProgram.programId,
                        })
                        .rpc();

                    console.log(`Member ${memberAddr} added:`, memberTx);
                } catch (err) {
                    console.error(`Failed to add member ${memberAddr}:`, err);
                }
            }

            setResult({
                groupSplitPDA: groupSplitPDA.toString(),
                transaction: tx,
                memberCount: members.length,
                amountPerPerson: (parseFloat(totalAmount) / members.length).toFixed(4),
            });

        } catch (err) {
            console.error('Error creating group split:', err);
            setError(err.message || 'Failed to create group split');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupSplit = async (splitAddress) => {
        try {
            const program = getProgram(wallet);
            const splitPubkey = new PublicKey(splitAddress);
            const splitData = await program.account.groupSplit.fetch(splitPubkey);

            console.log('Group Split Data:', splitData);
            alert(JSON.stringify(splitData, null, 2));
        } catch (err) {
            console.error('Error fetching split:', err);
            alert('Failed to fetch split: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Test Group Split</h1>

            <div style={{ marginBottom: '20px' }}>
                <SolanaConnectButton />
            </div>

            {publicKey && (
                <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
                    <strong>Connected:</strong> {publicKey.toString()}
                </div>
            )}

            <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <h2>Create Group Split</h2>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Title:
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Dinner at Restaurant"
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Total Amount (SOL):
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="1.5"
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Member Addresses (one per line):
                    </label>
                    <textarea
                        value={memberAddresses}
                        onChange={(e) => setMemberAddresses(e.target.value)}
                        placeholder="Enter wallet addresses, one per line"
                        rows={5}
                        style={{ width: '100%', padding: '8px', fontSize: '14px', fontFamily: 'monospace' }}
                    />
                    <small style={{ color: '#666' }}>
                        Max 20 members. Each member will pay: {totalAmount && memberAddresses.split('\n').filter(a => a.trim()).length > 0
                            ? (parseFloat(totalAmount) / memberAddresses.split('\n').filter(a => a.trim()).length).toFixed(4)
                            : '0'} SOL
                    </small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        IPFS Hash (optional):
                    </label>
                    <input
                        type="text"
                        value={ipfsHash}
                        onChange={(e) => setIpfsHash(e.target.value)}
                        placeholder="QmTest123"
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    />
                </div>

                <button
                    onClick={createGroupSplit}
                    disabled={loading || !publicKey || !title || !totalAmount || !memberAddresses}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        background: loading ? '#ccc' : '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        width: '100%',
                    }}
                >
                    {loading ? 'Creating...' : 'Create Group Split'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', marginBottom: '20px' }}>
                    <strong style={{ color: '#c00' }}>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div style={{ padding: '20px', background: '#efe', border: '1px solid #cfc', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0, color: '#060' }}>✓ Group Split Created!</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Group Split Address:</strong>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', marginTop: '5px' }}>
                            {result.groupSplitPDA}
                        </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Transaction:</strong>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', marginTop: '5px' }}>
                            {result.transaction}
                        </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Members:</strong> {result.memberCount}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Amount per Person:</strong> {result.amountPerPerson} SOL
                    </div>
                    <button
                        onClick={() => fetchGroupSplit(result.groupSplitPDA)}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            background: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '10px',
                        }}
                    >
                        Fetch Split Data
                    </button>
                </div>
            )}

            <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                <h3>Quick Test Addresses</h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Copy these test addresses (one per line) to test with multiple members:
                </p>
                <pre style={{
                    background: 'white',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflow: 'auto',
                    border: '1px solid #ddd'
                }}>
                    {`9we6kjtbcZ2vy3GSLLsZTEhbAqXPTRvEyoxa8wxSqKp5
2xNweLHLqrbx4zo1waDvgWJHgsUpPj8Y8icbAFeR4a8i
3kVK9PX5GUZB7PkRnbsHbeQHg5nA2xWZZXZ7Jz8vkGqM`}
                </pre>
            </div>
        </div>
    );
}
