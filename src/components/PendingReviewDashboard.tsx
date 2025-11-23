import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Clock, Eye, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingCard {
  id: string;
  client_id: string;
  card_type: string;
  status: string;
  ai_generated_at: string;
  clients: {
    name: string;
  };
}

interface PendingReviewDashboardProps {
  onReviewCard: (cardId: string, cardType: string) => void;
}

export function PendingReviewDashboard({ onReviewCard }: PendingReviewDashboardProps) {
  const [cards, setCards] = useState<PendingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingCard, setSendingCard] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCards();
  }, []);

  const fetchPendingCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_review_cards')
        .select('*, clients(name)')
        .in('status', ['pending', 'edited'])
        .order('ai_generated_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching pending cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending review cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCard = async (cardId: string) => {
    setSendingCard(cardId);
    try {
      const { error } = await supabase.functions.invoke('send-card-to-client', {
        body: { card_id: cardId }
      });

      if (error) throw error;

      toast({
        title: "Card Sent",
        description: "Assessment card sent to client successfully",
      });

      fetchPendingCards(); // Refresh list
    } catch (error: any) {
      console.error('Error sending card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send card to client",
        variant: "destructive",
      });
    } finally {
      setSendingCard(null);
    }
  };

  const getCardTypeLabel = (cardType: string) => {
    const labels: Record<string, string> = {
      'health_assessment': 'Health Assessment',
      'stress_card': 'Stress Card',
      'sleep_card': 'Sleep Card',
      'action_plan': 'Action Plan',
      'diet_plan': 'Diet Plan'
    };
    return labels[cardType] || cardType;
  };

  const getCardTypeColor = (cardType: string) => {
    const colors: Record<string, string> = {
      'health_assessment': 'bg-blue-500',
      'stress_card': 'bg-orange-500',
      'sleep_card': 'bg-purple-500',
      'action_plan': 'bg-green-500',
      'diet_plan': 'bg-pink-500'
    };
    return colors[cardType] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Review Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            No cards pending review at the moment
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pending Review Cards
          <Badge variant="secondary">{cards.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-3 h-3 rounded-full ${getCardTypeColor(card.card_type)}`} />
                <div className="flex-1">
                  <div className="font-medium">{card.clients.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getCardTypeLabel(card.card_type)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(new Date(card.ai_generated_at), { addSuffix: true })}
                </div>
                {card.status === 'edited' && (
                  <Badge variant="outline">Edited</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReviewCard(card.id, card.card_type)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSendCard(card.id)}
                  disabled={sendingCard === card.id}
                >
                  {sendingCard === card.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
