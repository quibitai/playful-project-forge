import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Heart, 
  Smile, 
  Laugh, 
  Angry, 
  Frown, 
  Meh,
  AlertCircle
} from 'lucide-react';

interface Reaction {
  id: string;
  reaction: string;
  user_id: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
}

const reactionIcons = {
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  'heart': Heart,
  'smile': Smile,
  'laugh': Laugh,
  'angry': Angry,
  'frown': Frown,
  'meh': Meh,
  'annoyed': AlertCircle,
};

export const MessageReactions = ({ messageId, reactions }: MessageReactionsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [localReactions, setLocalReactions] = useState<Reaction[]>(reactions);

  const handleReaction = async (reactionType: string) => {
    if (!user) return;

    try {
      const existingReaction = localReactions.find(
        r => r.user_id === user.id && r.reaction === reactionType
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;

        setLocalReactions(localReactions.filter(r => r.id !== existingReaction.id));
      } else {
        // Add reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            reaction: reactionType,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setLocalReactions([...localReactions, data]);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const getReactionCount = (type: string) => {
    return localReactions.filter(r => r.reaction === type).length;
  };

  const hasUserReacted = (type: string) => {
    return user && localReactions.some(r => r.user_id === user.id && r.reaction === type);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Object.entries(reactionIcons).map(([type, Icon]) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1 px-2 py-1 ${
            hasUserReacted(type) ? 'bg-muted' : ''
          }`}
          onClick={() => handleReaction(type)}
        >
          <Icon className="h-4 w-4" />
          <span className="text-xs">{getReactionCount(type)}</span>
        </Button>
      ))}
    </div>
  );
};