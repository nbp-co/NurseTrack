import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: z.string().min(1, "Message is required"),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "general",
      message: "",
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackForm) => {
      return apiRequest(
        "POST",
        `/api/feedback?userId=${user?.id}`,
        {
          ...data,
          page: location,
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FeedbackForm) => {
    submitFeedback.mutate(data);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          size="icon"
          data-testid="button-feedback"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        <span className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-full shadow-sm">
          v1.0.0
        </span>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-feedback">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Send Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve the app by sharing your thoughts, reporting bugs, or suggesting features.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-type">
                          <SelectValue placeholder="Select feedback type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="general">General Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your feedback..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-feedback-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-cancel-feedback"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitFeedback.isPending}
                  data-testid="button-submit-feedback"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitFeedback.isPending ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}