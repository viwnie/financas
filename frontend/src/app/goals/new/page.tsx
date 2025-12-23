'use client';

import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SavingsGoalsService } from '@/lib/savings-goals.service';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export default function NewGoalPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            await SavingsGoalsService.create(token!, {
                name: formData.get('name') as string,
                targetAmount: parseFloat(formData.get('target') as string),
                deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string).toISOString() : undefined,
            });
            toast.success('Goal created successfully!');
            router.push('/goals');
        } catch (error) {
            toast.error('Failed to create goal');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto p-4 md:p-8 max-w-2xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goals
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Savings Goal</CardTitle>
                        <CardDescription>Visualize your target. What are you saving for?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="name">Goal Name</Label>
                                <Input id="name" name="name" placeholder="e.g. Emergency Fund, New Car" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target">Target Amount</Label>
                                <Input id="target" name="target" type="number" step="0.01" placeholder="0.00" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline">Target Date (Optional)</Label>
                                <Input id="deadline" name="deadline" type="date" />
                            </div>

                            <div className="pt-4">
                                <Button className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Creating...' : 'Create Goal'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
