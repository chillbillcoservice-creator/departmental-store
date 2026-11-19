import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const sp = await searchParams;

    const storeName = typeof sp.store === 'string' ? sp.store : 'Supermarket';
    const total = typeof sp.total === 'string' ? sp.total : '';
    const currency = typeof sp.currency === 'string' ? sp.currency : 'Rs.';

    const title = `Receipt for Bill #${id} - ${storeName}`;
    const description = total
        ? `Grand Total: ${currency} ${total} • Official digital receipt from ${storeName}.`
        : `Official digital receipt for Bill #${id} from ${storeName}.`;

    // Construct image URL
    const query = new URLSearchParams();
    if (typeof sp.store === 'string') query.set('store', sp.store);
    if (typeof sp.total === 'string') query.set('total', sp.total);
    if (typeof sp.items === 'string') query.set('items', sp.items);
    if (typeof sp.method === 'string') query.set('method', sp.method);
    if (typeof sp.date === 'string') query.set('date', sp.date);
    if (typeof sp.currency === 'string') query.set('currency', sp.currency);
    if (typeof sp.customer === 'string') query.set('customer', sp.customer);
    if (sp.b2b === 'true') query.set('b2b', 'true');

    const imageUrl = `https://chillbill-store.vercel.app/api/bills/${encodeURIComponent(id)}/image?${query.toString()}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: imageUrl,
                    width: 800,
                    height: 520,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default async function CustomerBillPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const sp = await searchParams;

    const storeName = typeof sp.store === 'string' ? sp.store : 'ChillBill Supermarket';
    const total = typeof sp.total === 'string' ? sp.total : '0.00';
    const currency = typeof sp.currency === 'string' ? sp.currency : 'Rs.';
    const method = typeof sp.method === 'string' ? sp.method : 'UPI / Cash';
    const dateStr = typeof sp.date === 'string' ? sp.date : new Date().toLocaleDateString('en-IN');
    const customer = typeof sp.customer === 'string' ? sp.customer : 'Valued Customer';
    const itemsCount = typeof sp.items === 'string' ? sp.items : '1';

    // Construct direct image URL for display and download
    const query = new URLSearchParams();
    if (typeof sp.store === 'string') query.set('store', sp.store);
    if (typeof sp.total === 'string') query.set('total', sp.total);
    if (typeof sp.items === 'string') query.set('items', sp.items);
    if (typeof sp.method === 'string') query.set('method', sp.method);
    if (typeof sp.date === 'string') query.set('date', sp.date);
    if (typeof sp.currency === 'string') query.set('currency', sp.currency);
    if (typeof sp.customer === 'string') query.set('customer', sp.customer);
    if (sp.b2b === 'true') query.set('b2b', 'true');

    const imageUrl = `/api/bills/${encodeURIComponent(id)}/image?${query.toString()}`;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Store Branding Header */}
                <div className="bg-emerald-600 text-white p-6 text-center">
                    <span className="text-xs uppercase font-extrabold tracking-widest bg-emerald-700/60 px-3 py-1 rounded-full inline-block mb-2">
                        Official Digital Receipt
                    </span>
                    <h1 className="text-2xl font-black uppercase tracking-tight">{storeName}</h1>
                    <p className="text-emerald-100 text-xs mt-1">Thank you for your purchase!</p>
                </div>

                {/* Receipt Image Card */}
                <div className="p-4 bg-slate-100 border-b border-slate-200">
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt={`Receipt for Bill #${id}`}
                            className="w-full h-auto object-contain block"
                        />
                    </div>
                </div>

                {/* Details Breakdown */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase font-bold block">Bill Number</span>
                            <span className="font-mono font-bold text-slate-800 text-base">#{id}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase font-bold block">Date</span>
                            <span className="font-semibold text-slate-800">{dateStr}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase font-bold block">Billed To</span>
                            <span className="font-semibold text-slate-800 truncate block">{customer}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase font-bold block">Payment Mode</span>
                            <span className="font-bold text-emerald-600 uppercase">{method}</span>
                        </div>
                    </div>

                    {/* Total Amount Box */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider block">
                                Total Paid
                            </span>
                            <span className="text-xs text-emerald-600 font-medium">{itemsCount} items verified</span>
                        </div>
                        <span className="text-2xl font-black text-emerald-700 font-mono">
                            {currency} {total}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <a
                            href={imageUrl}
                            download={`Bill-${id}.png`}
                            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl text-center shadow-md transition-colors"
                        >
                            📥 Download Bill Image
                        </a>
                        <Link
                            href="/"
                            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl text-center border border-slate-200 transition-colors"
                        >
                            Store Info
                        </Link>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 text-center border-t border-slate-100 text-xs text-slate-400">
                    Powered by ChillBill Supermarket Retail POS
                </div>
            </div>
        </div>
    );
}
