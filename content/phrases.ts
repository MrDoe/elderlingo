import type { PhraseEntry } from '../shared/types';
import { slugify } from '../shared/utils';

export interface PhraseCategory {
  id: string;
  title: string;
  en: string;
}

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  { id: 'greetings', title: 'Grētunga', en: 'Greetings' },
  { id: 'introductions', title: 'Frignunga', en: 'Introductions' },
  { id: 'feelings', title: 'Gebǣru', en: 'Feelings' },
  { id: 'family', title: 'Cynn', en: 'Family & people' },
  { id: 'weather', title: 'Weder', en: 'Weather & nature' },
  { id: 'animals', title: 'Dēor', en: 'Animals' },
  { id: 'language', title: 'Sprǣc', en: 'Language & daily life' },
  { id: 'objects', title: 'Þing', en: 'Objects' },
  { id: 'commands', title: 'Bebodu', en: 'Commands' },
  { id: 'travel', title: 'Færeld', en: 'Travel' },
];

export const PHRASES: PhraseEntry[] = [
  // Grētunga — Greetings
  { oe: 'Wēs hāl.', en: 'Hello!', category: 'greetings', tts: 'wess haal' },
  { oe: 'Wesaþ hāle.', en: 'Hello! (to several people)', category: 'greetings' },
  { oe: 'Gōdne morgen.', en: 'Good morning.', category: 'greetings' },
  { oe: 'Gōdne ǣfen.', en: 'Good evening.', category: 'greetings' },
  { oe: 'Gōde niht.', en: 'Good night.', category: 'greetings' },
  { oe: 'Gēa.', en: 'Yes.', category: 'greetings' },
  { oe: 'Nese.', en: 'No.', category: 'greetings' },
  { oe: 'Ic þancie þē.', en: 'Thank you.', category: 'greetings' },
  { oe: 'God þē mid sīe.', en: 'Goodbye. (God be with you.)', category: 'greetings' },
  { oe: 'Far wel.', en: 'Farewell.', category: 'greetings' },

  // Frignunga — Introductions
  { oe: 'Hwæt is þīn nama?', en: 'What is your name?', category: 'introductions' },
  { oe: 'Mīn nama is Wulf.', en: 'My name is Wulf.', category: 'introductions' },
  { oe: 'Hwanon eart þū?', en: 'Where are you from?', category: 'introductions' },
  { oe: 'Ic eom of Englalande.', en: 'I am from England.', category: 'introductions' },
  { oe: 'Hwǣr eart þū?', en: 'Where are you?', category: 'introductions' },
  { oe: 'Ic eom hēr.', en: 'I am here.', category: 'introductions' },
  { oe: 'Hū eald eart þū?', en: 'How old are you?', category: 'introductions' },
  { oe: 'Ic eom geong.', en: 'I am young.', category: 'introductions' },
  { oe: 'Hū gǣþ hit?', en: 'How is it going?', category: 'introductions' },
  { oe: 'Hit gǣþ wel.', en: 'It is going well.', category: 'introductions', tts: 'hitt jääth well' },

  // Gebǣru — Feelings
  { oe: 'Ic eom wērig.', en: 'I am tired.', category: 'feelings' },
  { oe: 'Ic eom grǣdig.', en: 'I am hungry.', category: 'feelings' },
  { oe: 'Ic eom þurstig.', en: 'I am thirsty.', category: 'feelings' },
  { oe: 'Ic lufige þē.', en: 'I love you.', category: 'feelings' },
  { oe: 'Mīn heorte is glæd.', en: 'My heart is glad.', category: 'feelings' },
  { oe: 'Hit is sōþ.', en: 'It is true.', category: 'feelings' },
  { oe: 'Ic nāt.', en: 'I do not know.', category: 'feelings' },
  { oe: 'Wā is mē.', en: 'Woe is me.', category: 'feelings' },
  { oe: 'Hē is dēad.', en: 'He is dead.', category: 'feelings' },
  { oe: 'Hēo is cwic.', en: 'She is alive.', category: 'feelings' },

  // Cynn — Family & people
  { oe: 'Hē is mīn brōðor.', en: 'He is my brother.', category: 'family' },
  { oe: 'Hēo is mīn sweostor.', en: 'She is my sister.', category: 'family' },
  { oe: 'Mīn fæder is strang.', en: 'My father is strong.', category: 'family' },
  { oe: 'Mīn mōdor is wīs.', en: 'My mother is wise.', category: 'family' },
  { oe: 'Þæt cild plægþ.', en: 'The child plays.', category: 'family' },
  { oe: 'Se mann is hēah.', en: 'The man is tall.', category: 'family' },
  { oe: 'Þæt wīf is scīene.', en: 'The woman is beautiful.', category: 'family' },
  { oe: 'Hwǣr is se cyning?', en: 'Where is the king?', category: 'family' },
  { oe: 'Sēo cwēn is wīs.', en: 'The queen is wise.', category: 'family' },
  { oe: 'Se scop singþ.', en: 'The poet sings.', category: 'family', tts: 'ße skopp ßingth' },

  // Weder — Weather & nature
  { oe: 'Hit rīnþ.', en: 'It is raining.', category: 'weather' },
  { oe: 'Sēo sunne scīnþ.', en: 'The sun shines.', category: 'weather', tts: 'ßeo ßunne schiinth' },
  { oe: 'Se snāw feallþ.', en: 'The snow falls.', category: 'weather', tts: 'ße ßnaaw feallth' },
  { oe: 'Se wind blǣwþ.', en: 'The wind blows.', category: 'weather' },
  { oe: 'Hit is ceald.', en: 'It is cold.', category: 'weather', tts: 'hitt is keald' },
  { oe: 'Hit is wearm.', en: 'It is warm.', category: 'weather' },
  { oe: 'Se dæg is beorht.', en: 'The day is bright.', category: 'weather' },
  { oe: 'Sēo niht is þīestre.', en: 'The night is dark.', category: 'weather' },
  { oe: 'Se wudu is grēne.', en: 'The forest is green.', category: 'weather', tts: 'ße wudu iß grehne' },
  { oe: 'Þæt trēow is eald.', en: 'The tree is old.', category: 'weather', tts: 'thät tréo iß eald' },

  // Dēor — Animals
  { oe: 'Se hund is gōd.', en: 'The dog is good.', category: 'animals' },
  { oe: 'Sēo catte slǣpþ.', en: 'The cat sleeps.', category: 'animals' },
  { oe: 'Þæt hors yrnþ.', en: 'The horse runs.', category: 'animals' },
  { oe: 'Se fugol singþ.', en: 'The bird sings.', category: 'animals' },
  { oe: 'Ic sēo þone wulf.', en: 'I see the wolf.', category: 'animals' },
  { oe: 'Se fisc swimþ.', en: 'The fish swims.', category: 'animals' },
  { oe: 'Se hafoc flīehþ.', en: 'The hawk flies.', category: 'animals' },
  { oe: 'Þæt cild lufige þone hund.', en: 'The child loves the dog.', category: 'animals' },
  { oe: 'Se bera is strang.', en: 'The bear is strong.', category: 'animals' },
  { oe: 'Hwǣr is þæt dēor?', en: 'Where is the animal?', category: 'animals' },

  // Sprǣc — Language & daily life
  { oe: 'Hwæt dēst þū?', en: 'What are you doing?', category: 'language' },
  { oe: 'Ic leornige Ænglisc.', en: 'I am learning English.', category: 'language' },
  { oe: 'Spricst þū Ænglisc?', en: 'Do you speak English?', category: 'language' },
  { oe: 'Ic ne mæg þē understandan.', en: 'I cannot understand you.', category: 'language' },
  { oe: 'Ic gā tō hūse.', en: 'I am going home.', category: 'language' },
  { oe: 'Ic ete hlāf.', en: 'I eat bread.', category: 'language' },
  { oe: 'Ic drince wæter.', en: 'I drink water.', category: 'language', tts: 'itsch drinke wäter' },
  { oe: 'Hē drincþ medu.', en: 'He drinks mead.', category: 'language' },
  { oe: 'Wē etaþ flæsc.', en: 'We eat meat.', category: 'language' },
  { oe: 'Ic slǣpe wel.', en: 'I sleep well.', category: 'language' },

  // Þing — Objects
  { oe: 'Hwæt is þæt?', en: 'What is that?', category: 'objects' },
  { oe: 'Þæt is bōc.', en: 'That is a book.', category: 'objects' },
  { oe: 'Þæt is sweord.', en: 'That is a sword.', category: 'objects' },
  { oe: 'Ic hæbbe ān æppel.', en: 'I have an apple.', category: 'objects' },
  { oe: 'Þū hæfst gōd swurd.', en: 'You have a good sword.', category: 'objects' },
  { oe: 'Sēo heall is micel.', en: 'The hall is great.', category: 'objects' },
  { oe: 'Mīn hūs is stǣnen.', en: 'My house is of stone.', category: 'objects' },
  { oe: 'Þæt fȳr byrnþ.', en: 'The fire burns.', category: 'objects' },
  { oe: 'Sēo ēa is dēop.', en: 'The river is deep.', category: 'objects' },
  { oe: 'Se bāt is læt.', en: 'The boat is slow.', category: 'objects' },

  // Bebodu — Commands
  { oe: 'Wacaþ!', en: 'Wake up!', category: 'commands' },
  { oe: 'Cumaþ hēr.', en: 'Come here.', category: 'commands' },
  { oe: 'Gā aweg.', en: 'Go away.', category: 'commands' },
  { oe: 'Lǣt mē bēon.', en: 'Leave me alone.', category: 'commands' },
  { oe: 'Sing mē sang.', en: 'Sing me a song.', category: 'commands' },
  { oe: 'Bring mē þæt scip.', en: 'Bring me the ship.', category: 'commands' },
  { oe: 'Hēo cwiþ sōþ.', en: 'She speaks the truth.', category: 'commands' },
  { oe: 'Þæt weorc is heard.', en: 'The work is hard.', category: 'commands' },
  { oe: 'Þæt is gōd rǣd.', en: 'That is good advice.', category: 'commands' },
  { oe: 'Wē wuniaþ on friþe.', en: 'We live in peace.', category: 'commands' },

  // Færeld — Travel
  { oe: 'Ic fāre ofer sǣ.', en: 'I travel over the sea.', category: 'travel' },
  { oe: 'Se cniht rītt.', en: 'The knight rides.', category: 'travel' },
  { oe: 'Hīe rīdaþ tō tūne.', en: 'They ride to town.', category: 'travel' },
  { oe: 'Ic eom fūs tō farenne.', en: 'I am ready to go.', category: 'travel' },
  { oe: 'Hē sēceþ gold.', en: 'He seeks gold.', category: 'travel' },
  { oe: 'Ic sēce mīnne frēond.', en: 'I seek my friend.', category: 'travel' },
  { oe: 'Hwelc dæg is tōdæg?', en: 'Which day is today?', category: 'travel' },
  { oe: 'Tōdæg is Frīgedæg.', en: 'Today is Friday.', category: 'travel' },
  { oe: 'Ic lufie gōdne sang.', en: 'I love a good song.', category: 'travel', tts: 'itsch lufiöh gohdne ßang' },
  { oe: 'Ic geseah sumne mann.', en: 'I saw a man.', category: 'travel', tts: 'itsch jesääh ßumne mann' },
];

export function phraseSlug(phrase: PhraseEntry): string {
  return slugify(phrase.oe);
}

export function phrasesByCategory(category: string): PhraseEntry[] {
  return PHRASES.filter((p) => p.category === category);
}
