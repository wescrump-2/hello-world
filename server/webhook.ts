class WebhookPayload {
	// Basic message properties
	content?: string;
	username?: string;
	avatar_url?: string;
	tts?: boolean;
  
	// Embed properties
	embeds?: Embed[];
  
	// Mention control
	allowed_mentions?: AllowedMentions;
  
	constructor(
	  content?: string, 
	  username?: string, 
	  avatar_url?: string, 
	  tts?: boolean, 
	  embeds?: Embed[], 
	  allowed_mentions?: AllowedMentions
	) {
	  this.content = content;
	  this.username = username;
	  this.avatar_url = avatar_url;
	  this.tts = tts;
	  this.embeds = embeds;
	  this.allowed_mentions = allowed_mentions;
	}
  
	// Method to add an embed
	addEmbed(embed: Embed) {
	  if (!this.embeds) this.embeds = [];
	  this.embeds.push(embed);
	}
  
	// Method to set allowed mentions
	setAllowedMentions(allowed_mentions: AllowedMentions) {
	  this.allowed_mentions = allowed_mentions;
	}
  
	// Convert to JSON for sending
	toJSON(): object {
	  return {
		content: this.content,
		username: this.username,
		avatar_url: this.avatar_url,
		tts: this.tts,
		embeds: this.embeds?.map(embed => embed.toJSON()),
		allowed_mentions: this.allowed_mentions
	  };
	}
  }
  
  class Embed {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	fields?: Field[];
	author?: Author;
	thumbnail?: Thumbnail;
	image?: Image;
	footer?: Footer;
	timestamp?: string;
  
	constructor(
	  title?: string, 
	  description?: string, 
	  url?: string, 
	  color?: number, 
	  fields?: Field[], 
	  author?: Author, 
	  thumbnail?: Thumbnail, 
	  image?: Image, 
	  footer?: Footer, 
	  timestamp?: string
	) {
	  this.title = title;
	  this.description = description;
	  this.url = url;
	  this.color = color;
	  this.fields = fields;
	  this.author = author;
	  this.thumbnail = thumbnail;
	  this.image = image;
	  this.footer = footer;
	  this.timestamp = timestamp;
	}
  
	// Convert to JSON for sending
	toJSON(): object {
	  return {
		title: this.title,
		description: this.description,
		url: this.url,
		color: this.color,
		fields: this.fields?.map(field => field.toJSON()),
		author: this.author,
		thumbnail: this.thumbnail,
		image: this.image,
		footer: this.footer,
		timestamp: this.timestamp
	  };
	}
  }
  
  class Field {
	name: string;
	value: string;
	inline?: boolean;
  
	constructor(name: string, value: string, inline?: boolean) {
	  this.name = name;
	  this.value = value;
	  this.inline = inline;
	}
  
	toJSON(): object {
	  return {
		name: this.name,
		value: this.value,
		inline: this.inline
	  };
	}
  }
  
  interface Author {
	name: string;
	url?: string;
	icon_url?: string;
  }
  
  interface Thumbnail {
	url: string;
  }
  
  interface Image {
	url: string;
  }
  
  interface Footer {
	text: string;
	icon_url?: string;
  }
  
  interface AllowedMentions {
	parse?: string[];
	users?: string[];
	roles?: string[];
  }
  
  // Example usage:
  const payload = new WebhookPayload(
	"Here's an embed example.",
	"CustomBot",
	"https://example.com/avatar.png"
  );
  
  const embed = new Embed(
	"Embed Title",
	"This is an embed description.",
	"https://example.com",
	15258703,
	[
	  new Field("Field Name", "Field Value", true),
	  new Field("Another Field", "Another Value", true)
	],
	{ name: "Author Name", url: "https://example.com/author", icon_url: "https://example.com/author_icon.png" },
	{ url: "https://example.com/thumbnail.jpg" },
	{ url: "https://example.com/image.jpg" },
	{ text: "Footer Text", icon_url: "https://example.com/footer_icon.png" },
	"2024-12-21T00:00:00.000Z"
  );
  
  payload.addEmbed(embed);
  
  // Convert to JSON for sending to Discord webhook
  const jsonPayload = payload.toJSON();
  console.log(JSON.stringify(jsonPayload, null, 2));